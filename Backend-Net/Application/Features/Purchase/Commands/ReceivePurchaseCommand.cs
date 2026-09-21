using Application.Common.Contracts.Context;
using Application.Common.Contracts.InventoryCosting;
using Application.Common.Contracts.ProductUnit;
using Application.Common.Contracts.PurchaseReturn;
using Application.Common.Contracts.Storage;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Features.Purchase.Dtos;
using Common.Exceptions;
using Common.Extensions;
using Domain.Entities;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Purchase.Commands
{
    // Receiving by physical count. The warehouse reports what it can actually see - how many arrived per line, how many of those
    // are bad and why, and products that arrived without a line - and the server turns that into units:
    //
    //   S = still owed on the line, A = arrived, D = defective, H = A - D healthy
    //   h = min(H, S)          healthy on the order  -> IN_STOCK, on the line, into the cost pool at the line price
    //   d = min(D, S - h)      defective on the order -> QUARANTINED ON_ORDER, on the line, value held off-pool at the line price
    //   A - h - d              excess                 -> QUARANTINED EXCESS, not on the line, no value (never paid for)
    //
    // DELIBERATE EXCEPTION, scoped to receiving only: this healthy-first allocation is the one place the server decides rather than
    // records. Units of one product are indistinguishable and the worker on the ramp cannot know which of them the line "owns";
    // nobody else can decide it either. Healthy-first is the only rule under which we never hold a paid-for defective unit while a
    // healthy one sits unpaid. This is NOT a precedent for inferring anything in return resolutions - the effect layer records what
    // the client states and infers nothing (see docs/api-guide.fa.md section 10, "effect model").
    //
    // Problems are recorded as PurchaseReceivingDiscrepancy rows for the discrepancy form and the audit trail. Claim quotas come
    // from the units' CustodyReason, never from those rows. Problems with received goods are still reported explicitly through
    // CreatePurchaseReturnCommand; nothing here creates a return.
    public class ReceivePurchaseCommand : IRequest<ResponseDto>
    {
        public int PurchaseId { get; set; }
        public DateTime? ReceivedDate { get; set; }
        public string? ReceivingNote { get; set; }
        public string? DriverPhoneNumber { get; set; }
        public string? DriverFullName { get; set; }
        public string? VehiclePlate { get; set; }
        public List<ReceivePurchaseItemDto> Items { get; set; } = new();
        public List<ReceivePurchaseUnlistedItemDto> UnlistedItems { get; set; } = new();
        public List<ReceivePurchaseImageDto> Images { get; set; } = new();
    }

    public class ReceivingDefectDtoValidator : AbstractValidator<ReceivingDefectDto>
    {
        public ReceivingDefectDtoValidator()
        {
            RuleFor(x => x.Problem).IsInEnum().WithMessage("نوع مشکل نامعتبر است.");
            RuleFor(x => x.Quantity).GreaterThan(0).WithMessage("مقدار کالای مشکل‌دار باید از صفر بیشتر باشد.");
        }
    }

    public class ReceivePurchaseCommandValidator : AbstractValidator<ReceivePurchaseCommand>
    {
        private const string DefectsExceedArrivedMessage = "مجموع کالای مشکل‌دار نمی‌تواند از مقدار رسیده بیشتر باشد.";

        public ReceivePurchaseCommandValidator()
        {
            RuleFor(x => x.PurchaseId).NotNull().WithMessage(Validation.RequiredMessage("خرید"));
            RuleFor(x => x).Must(x => (x.Items?.Count ?? 0) + (x.UnlistedItems?.Count ?? 0) > 0)
                .WithMessage(Validation.RequiredMessage("لیست اقلام دریافتی"));
            RuleFor(x => x.Items).Must(items => items == null || items.Select(i => i.PurchaseItemId).Distinct().Count() == items.Count)
                .WithMessage("هر آیتم خرید فقط یک‌بار می‌تواند در یک درخواست دریافت ظاهر شود.");
            RuleFor(x => x.UnlistedItems).Must(items => items == null || items.Select(i => i.ProductId).Distinct().Count() == items.Count)
                .WithMessage("هر کالای خارج از سند فقط یک‌بار می‌تواند در یک درخواست دریافت ظاهر شود.");
            RuleForEach(x => x.Items).ChildRules(item =>
            {
                item.RuleFor(i => i.PurchaseItemId).GreaterThan(0).WithMessage(Validation.RequiredMessage("آیتم خرید"));
                item.RuleFor(i => i.ArrivedQuantity).GreaterThan(0).WithMessage("مقدار رسیده باید از صفر بیشتر باشد.");
                item.RuleForEach(i => i.Defects).SetValidator(new ReceivingDefectDtoValidator());
                item.RuleFor(i => i).Must(i => (i.Defects ?? new()).Sum(d => d.Quantity) <= i.ArrivedQuantity).WithMessage(DefectsExceedArrivedMessage);
            });
            RuleForEach(x => x.UnlistedItems).ChildRules(item =>
            {
                item.RuleFor(i => i.ProductId).GreaterThan(0).WithMessage(Validation.RequiredMessage("کالا"));
                item.RuleFor(i => i.ArrivedQuantity).GreaterThan(0).WithMessage("مقدار رسیده باید از صفر بیشتر باشد.");
                item.RuleForEach(i => i.Defects).SetValidator(new ReceivingDefectDtoValidator());
                item.RuleFor(i => i).Must(i => (i.Defects ?? new()).Sum(d => d.Quantity) <= i.ArrivedQuantity).WithMessage(DefectsExceedArrivedMessage);
            });
            RuleForEach(x => x.Images).ChildRules(image =>
            {
                image.RuleFor(i => i.ObjectKey).NotEmpty().WithMessage(Validation.RequiredMessage("شناسه تصویر"));
            });
            RuleFor(x => x.DriverPhoneNumber).Must(Validation.IsMobileNumber)
                .When(x => !string.IsNullOrWhiteSpace(x.DriverPhoneNumber))
                .WithMessage("شماره تماس راننده وارد شده صحیح نمی باشد.");
        }
    }

    public class ReceivePurchaseCommandHandler : IRequestHandler<ReceivePurchaseCommand, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IPurchaseReturnCalculationService _purchaseReturnCalculationService;
        private readonly IProductUnitService _productUnitService;
        private readonly IInventoryCostingService _inventoryCostingService;
        private readonly IObjectStorageService _objectStorageService;
        private readonly IUnitOfWork _unitOfWork;

        public ReceivePurchaseCommandHandler(IWMSDbContext context, IPurchaseReturnCalculationService purchaseReturnCalculationService, IProductUnitService productUnitService, IInventoryCostingService inventoryCostingService, IObjectStorageService objectStorageService, IUnitOfWork unitOfWork)
        {
            _context = context;
            _purchaseReturnCalculationService = purchaseReturnCalculationService;
            _productUnitService = productUnitService;
            _inventoryCostingService = inventoryCostingService;
            _objectStorageService = objectStorageService;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(ReceivePurchaseCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var purchase = await _context.Purchases
                .Include(x => x.Items)
                .ThenInclude(x => x.Product)
                .FirstOrDefaultAsync(x => x.Id == request.PurchaseId, cancellationToken) ?? throw new NotFoundCustomException("خرید مورد نظر یافت نشد.");

            if (purchase.Status == PurchaseStatusEnum.CANCELLED)
                throw new ValidationCustomException("خرید لغو شده قابل دریافت نیست.");

            var items = request.Items ?? new();
            var unlistedItems = request.UnlistedItems ?? new();
            var purchaseItems = purchase.Items.ToDictionary(x => x.Id);

            foreach (var reqItem in items)
            {
                if (!purchaseItems.ContainsKey(reqItem.PurchaseItemId))
                    throw new NotFoundCustomException("آیتم خرید مورد نظر یافت نشد.");
            }

            var unlistedProductIds = unlistedItems.Select(x => x.ProductId).ToList();
            var unlistedProducts = await _context.Products
                .Where(p => unlistedProductIds.Contains(p.Id))
                .ToDictionaryAsync(p => p.Id, cancellationToken);

            if (unlistedProducts.Count != unlistedProductIds.Count)
                throw new NotFoundCustomException("کالای انتخاب‌شده برای اقلام خارج از سند یافت نشد.");

            // A product the purchase does list arrives as excess on its line, never as "unlisted" - otherwise the same
            // goods could be held under two custody reasons with two different claim quotas.
            var listed = purchase.Items.FirstOrDefault(i => unlistedProductIds.Contains(i.ProductId));
            if (listed != null)
                throw new ValidationCustomException($"کالای «{listed.Product.Name}» در این خرید قلم دارد؛ مقدار اضافه‌ی آن را روی همان قلم ثبت کنید.");

            var now = DateTime.Now;
            var receivedAt = request.ReceivedDate ?? now;
            var movement = new UnitMovementContext(ProductUnitMovementReasonEnum.PURCHASE_RECEIVED, receivedAt, DocumentKindEnum.PURCHASE, purchase.Id, SupplierId: purchase.SupplierId, Note: request.ReceivingNote);

            var lines = new List<object>();

            foreach (var reqItem in items)
            {
                var purchaseItem = purchaseItems[reqItem.PurchaseItemId];
                var product = purchaseItem.Product;
                var defects = reqItem.Defects ?? new();

                // A line closed short owes nothing more: whatever still arrives on it is excess.
                var stillOwed = purchaseItem.StillOwedQuantity;
                var defective = defects.Sum(d => d.Quantity);
                var healthy = reqItem.ArrivedQuantity - defective;

                var healthyOnOrder = Math.Min(healthy, stillOwed);
                var defectiveOnOrder = Math.Min(defective, stillOwed - healthyOnOrder);
                var excess = reqItem.ArrivedQuantity - healthyOnOrder - defectiveOnOrder;

                // Defective-on-order units are bought, fully: on the line and at the line price. Excess is neither.
                purchaseItem.ReceivedQuantity += healthyOnOrder + defectiveOnOrder;
                product.Stock += healthyOnOrder;

                await _productUnitService.MintAsync(product, healthyOnOrder,
                    new UnitOrigin(purchase.Id, purchaseItem.Id, UnitCustodyReasonEnum.ON_ORDER), movement, cancellationToken);
                if (healthyOnOrder > 0)
                    await _inventoryCostingService.RecordPurchaseReceiptAsync(product, healthyOnOrder, purchaseItem.UnitPrice, purchaseItem.Discount, purchaseItem.Id, receivedAt, cancellationToken);

                // Each quarantined unit carries the value it entered with, so whatever later takes it out of quarantine moves
                // exactly that value: the paid-for defective share at the line's net price, excess at 0 (never paid for).
                if (defectiveOnOrder > 0)
                {
                    var netUnitCost = await _inventoryCostingService.RecordPurchaseReceiptQuarantinedAsync(product, defectiveOnOrder, purchaseItem.UnitPrice, purchaseItem.Discount, purchaseItem.Id, receivedAt, cancellationToken);
                    await _productUnitService.MintAsync(product, defectiveOnOrder,
                        UnitOrigin.Quarantined(purchase.Id, purchaseItem.Id, UnitCustodyReasonEnum.ON_ORDER, netUnitCost), movement, cancellationToken);
                }

                // Excess keeps its line id: it is more of this line's product, and an EXCESS claim names the line.
                await _productUnitService.MintAsync(product, excess,
                    UnitOrigin.Quarantined(purchase.Id, purchaseItem.Id, UnitCustodyReasonEnum.EXCESS, 0m), movement, cancellationToken);

                // The order line's defective share is filled in the order the defect rows were sent; whatever of a row does
                // not fit is excess.
                var onOrderDefectiveLeft = defectiveOnOrder;
                foreach (var defect in defects)
                {
                    var onOrderPart = Math.Min(defect.Quantity, onOrderDefectiveLeft);
                    onOrderDefectiveLeft -= onOrderPart;

                    await AddDiscrepancyAsync(purchase.Id, purchaseItem.Id, product.Id, UnitCustodyReasonEnum.ON_ORDER, defect.Problem, onOrderPart, defect.Note, receivedAt, now, cancellationToken);
                    await AddDiscrepancyAsync(purchase.Id, purchaseItem.Id, product.Id, UnitCustodyReasonEnum.EXCESS, defect.Problem, defect.Quantity - onOrderPart, defect.Note, receivedAt, now, cancellationToken);
                }

                await AddDiscrepancyAsync(purchase.Id, purchaseItem.Id, product.Id, UnitCustodyReasonEnum.EXCESS, ReturnProblemEnum.OVER_SHIPPED, healthy - healthyOnOrder, null, receivedAt, now, cancellationToken);

                lines.Add(new
                {
                    PurchaseItemId = purchaseItem.Id,
                    HealthyOnOrderQuantity = healthyOnOrder,
                    DefectiveOnOrderQuantity = defectiveOnOrder,
                    ExcessQuantity = excess,
                });
            }

            var unlisted = new List<object>();

            foreach (var reqItem in unlistedItems)
            {
                var product = unlistedProducts[reqItem.ProductId];
                var defects = reqItem.Defects ?? new();

                // Never on a line, never paid for: every unit is held until purchasing decides.
                await _productUnitService.MintAsync(product, reqItem.ArrivedQuantity,
                    UnitOrigin.Quarantined(purchase.Id, null, UnitCustodyReasonEnum.UNLISTED, 0m), movement, cancellationToken);

                foreach (var defect in defects)
                    await AddDiscrepancyAsync(purchase.Id, null, product.Id, UnitCustodyReasonEnum.UNLISTED, defect.Problem, defect.Quantity, defect.Note, receivedAt, now, cancellationToken);

                await AddDiscrepancyAsync(purchase.Id, null, product.Id, UnitCustodyReasonEnum.UNLISTED, ReturnProblemEnum.UNLISTED_ITEM, reqItem.ArrivedQuantity - defects.Sum(d => d.Quantity), null, receivedAt, now, cancellationToken);

                unlisted.Add(new { ProductId = product.Id, QuarantinedQuantity = reqItem.ArrivedQuantity });
            }

            foreach (var image in request.Images ?? new())
            {
                await _context.PurchaseReceivingImages.AddAsync(new PurchaseReceivingImage
                {
                    PurchaseId = purchase.Id,
                    // Stored as the bare bucket key, so a browser-facing image URL echoed back by
                    // the frontend is stripped down rather than persisted verbatim.
                    ObjectKey = _objectStorageService.NormalizeKey(image.ObjectKey) ?? image.ObjectKey,
                    FileName = image.FileName,
                    Note = image.Note,
                    CreatedAt = now,
                }, cancellationToken);
            }

            if (!string.IsNullOrWhiteSpace(request.DriverFullName) || !string.IsNullOrWhiteSpace(request.DriverPhoneNumber) || !string.IsNullOrWhiteSpace(request.VehiclePlate))
            {
                await _context.PurchaseDrivers.AddAsync(new PurchaseDriver
                {
                    PurchaseId = purchase.Id,
                    DriverFullName = request.DriverFullName,
                    DriverPhoneNumber = request.DriverPhoneNumber,
                    VehiclePlate = request.VehiclePlate,
                    CreatedAt = now,
                }, cancellationToken);
            }

            if (!string.IsNullOrWhiteSpace(request.ReceivingNote))
            {
                await _context.PurchaseReceivingNotes.AddAsync(new PurchaseReceivingNote
                {
                    PurchaseId = purchase.Id,
                    Note = request.ReceivingNote,
                    CreatedAt = now,
                }, cancellationToken);
            }

            purchase.Status = _purchaseReturnCalculationService.RecomputePurchaseStatus(purchase);
            purchase.UpdatedAt = now;

            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Data = new
            {
                PurchaseId = purchase.Id,
                PurchaseStatus = purchase.Status,
                Lines = lines,
                UnlistedItems = unlisted,
            };
            res.Message = "دریافت با موفقیت ثبت شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }

        private async Task AddDiscrepancyAsync(int purchaseId, int? purchaseItemId, int productId, UnitCustodyReasonEnum custodyReason, ReturnProblemEnum problem, int quantity, string? note, DateTime receivedAt, DateTime now, CancellationToken cancellationToken)
        {
            if (quantity <= 0)
                return;

            await _context.PurchaseReceivingDiscrepancies.AddAsync(new PurchaseReceivingDiscrepancy
            {
                PurchaseId = purchaseId,
                PurchaseItemId = purchaseItemId,
                ProductId = productId,
                CustodyReason = custodyReason,
                Problem = problem,
                Quantity = quantity,
                Note = note,
                ReceivedAt = receivedAt,
                CreatedAt = now,
            }, cancellationToken);
        }
    }
}
