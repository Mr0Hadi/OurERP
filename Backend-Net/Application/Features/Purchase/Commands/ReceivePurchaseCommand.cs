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
    // Reports received quantity/stock only - problems with received goods are reported separately
    // and explicitly via CreatePurchaseReturnCommand (mirrors how sale returns already worked; the
    // old "report an issue inline while receiving, auto-creates a PurchaseReturn" path is gone).
    public class ReceivePurchaseCommand : IRequest<ResponseDto>
    {
        public int PurchaseId { get; set; }
        public DateTime? ReceivedDate { get; set; }
        public string? ReceivingNote { get; set; }
        public List<ReceivePurchaseItemDto> Items { get; set; } = new();
        public List<ReceivePurchaseImageDto> Images { get; set; } = new();
    }

    public class ReceivePurchaseCommandValidator : AbstractValidator<ReceivePurchaseCommand>
    {
        public ReceivePurchaseCommandValidator()
        {
            RuleFor(x => x.PurchaseId).NotNull().WithMessage(Validation.RequiredMessage("خرید"));
            RuleFor(x => x.Items).NotEmpty().WithMessage(Validation.RequiredMessage("لیست اقلام دریافتی"));
            RuleFor(x => x.Items).Must(items => items.Select(i => i.PurchaseItemId).Distinct().Count() == items.Count)
                .WithMessage("هر آیتم خرید فقط یک‌بار می‌تواند در یک درخواست دریافت ظاهر شود.");
            RuleForEach(x => x.Items).ChildRules(item =>
            {
                item.RuleFor(i => i.PurchaseItemId).NotNull().WithMessage(Validation.RequiredMessage("آیتم خرید"));
                item.RuleFor(i => i.ReceivedQuantity).GreaterThan(0).WithMessage("مقدار دریافتی باید از صفر بیشتر باشد.");
            });
            RuleForEach(x => x.Images).ChildRules(image =>
            {
                image.RuleFor(i => i.ObjectKey).NotEmpty().WithMessage(Validation.RequiredMessage("شناسه تصویر"));
            });
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

            var purchaseItems = purchase.Items.ToDictionary(x => x.Id);

            foreach (var reqItem in request.Items)
            {
                if (!purchaseItems.TryGetValue(reqItem.PurchaseItemId, out var purchaseItem))
                    throw new NotFoundCustomException("آیتم خرید مورد نظر یافت نشد.");

                var stillOwed = purchaseItem.Quantity - purchaseItem.ReceivedQuantity;
                if (reqItem.ReceivedQuantity > stillOwed)
                    throw new ValidationCustomException($"مقدار وارد شده برای «{purchaseItem.Product.Name}» از باقیمانده قابل دریافت این قلم بیشتر است.");
            }

            var now = DateTime.Now;

            foreach (var reqItem in request.Items)
            {
                var purchaseItem = purchaseItems[reqItem.PurchaseItemId];

                purchaseItem.ReceivedQuantity += reqItem.ReceivedQuantity;
                purchaseItem.Product.Stock += reqItem.ReceivedQuantity;
                await _productUnitService.MintAsync(purchaseItem.Product, reqItem.ReceivedQuantity, purchaseItem.Id, cancellationToken);
                await _inventoryCostingService.RecordPurchaseReceiptAsync(purchaseItem.Product, reqItem.ReceivedQuantity, purchaseItem.UnitPrice, purchaseItem.Discount, purchaseItem.Id, now, cancellationToken);
            }

            foreach (var image in request.Images ?? new())
            {
                // Whatever the client sent - a bare key or a (possibly expired) signed URL - only
                // the stable object key is ever persisted.
                var objectKey = _objectStorageService.NormalizeKey(image.ObjectKey);
                if (string.IsNullOrWhiteSpace(objectKey))
                    continue;

                await _context.PurchaseReceivingImages.AddAsync(new PurchaseReceivingImage
                {
                    PurchaseId = purchase.Id,
                    ObjectKey = objectKey,
                    FileName = image.FileName,
                    Note = image.Note,
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
            };
            res.Message = "دریافت با موفقیت ثبت شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
