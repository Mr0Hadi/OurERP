using Application.Common.Ledger;
using Application.Common.Contracts.Context;
using Application.Common.Contracts.InventoryCosting;
using Application.Common.Contracts.ProductUnit;
using Application.Common.Contracts.PurchaseReturn;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Documents;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Common.Queries;
using Common.Exceptions;
using Common.Extensions;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Purchase.Commands
{
    // "We keep the extra goods and pay for them": quarantined EXCESS/UNLISTED units become part of the order (SAP / Odoo: the
    // over-delivery is added to the PO and received against it). An issued invoice is never edited, only supplemented, so every
    // acceptance adds a NEW line (IsSupplement): excess of an ordered line becomes a supplement line pointing back at it
    // (SupplementOfPurchaseItemId) at that line's price and discount, unlisted goods a supplement line at the supplier's invoice
    // price. No number on an existing line changes. Either way the units become IN_STOCK, custody ON_ORDER on the new line, and
    // enter the cost pool at the net price - so what we pay for them is also what they cost when sold. Purchase.TotalAmount grows
    // by the same amount; the payment itself is recorded through AddPurchasePayment like any other purchase payment.
    //
    // Why not a return resolution (GOODS_RELEASE + MONEY_OUT): a release carries the units' own quarantine value, 0 for goods nobody
    // paid for, and a MONEY_OUT is purchase spend with no inventory value - the goods would be sold at a cost of 0 and profit
    // overstated by exactly what we paid. That path now means "free goods"; buying them goes through here.
    public class AcceptPurchaseExcessCommand : IRequest<ResponseDto>
    {
        public int PurchaseId { get; set; }
        public DateTime? Date { get; set; }
        public string? Note { get; set; }
        public List<AcceptPurchaseExcessItemDto> Items { get; set; } = new();
    }

    public class AcceptPurchaseExcessItemDto
    {
        /// <summary>Excess held on this order line. Priced at the line: UnitPrice/Discount must be omitted.</summary>
        public int? PurchaseItemId { get; set; }

        /// <summary>Unlisted goods of this product held on the purchase. A new line is added at UnitPrice/Discount.</summary>
        public int? ProductId { get; set; }

        public int Quantity { get; set; }

        /// <summary>Unlisted only, required: the supplier's invoice price per unit.</summary>
        public UInt64? UnitPrice { get; set; }

        /// <summary>Unlisted only, optional (percent, default 0).</summary>
        public int? Discount { get; set; }

        /// <summary>Optional: exactly which quarantined units; otherwise FIFO by serial.</summary>
        public List<string>? ProductUnitBarcodes { get; set; }
    }

    public class AcceptPurchaseExcessCommandValidator : AbstractValidator<AcceptPurchaseExcessCommand>
    {
        public AcceptPurchaseExcessCommandValidator()
        {
            RuleFor(x => x.PurchaseId).GreaterThan(0).WithMessage(Validation.RequiredMessage("خرید"));
            RuleFor(x => x.Items).NotEmpty().WithMessage(Validation.RequiredMessage("لیست اقلام مازاد"));
            RuleFor(x => x.Items)
                .Must(items => items == null || items.Where(i => i.PurchaseItemId.HasValue).Select(i => i.PurchaseItemId).Distinct().Count() == items.Count(i => i.PurchaseItemId.HasValue))
                .WithMessage("هر قلم خرید فقط یک‌بار می‌تواند در یک درخواست ظاهر شود.");
            RuleFor(x => x.Items)
                .Must(items => items == null || items.Where(i => i.ProductId.HasValue).Select(i => i.ProductId).Distinct().Count() == items.Count(i => i.ProductId.HasValue))
                .WithMessage("هر کالای خارج از سند فقط یک‌بار می‌تواند در یک درخواست ظاهر شود.");
            RuleForEach(x => x.Items).ChildRules(item =>
            {
                item.RuleFor(i => i).Must(i => i.PurchaseItemId.HasValue != i.ProductId.HasValue)
                    .WithMessage("برای هر ردیف دقیقاً یکی از «قلم خرید» (مازاد) یا «کالا» (خارج از سند) را مشخص کنید.");
                item.RuleFor(i => i.Quantity).GreaterThan(0).WithMessage("مقدار پذیرش باید از صفر بیشتر باشد.");

                item.RuleFor(i => i).Must(i => i.UnitPrice == null && i.Discount == null)
                    .When(i => i.PurchaseItemId.HasValue)
                    .WithMessage("مازادِ یک قلم با قیمت و تخفیف همان قلم خریده می‌شود؛ قیمت جداگانه نفرستید.");
                item.RuleFor(i => i.UnitPrice).NotNull().Must(p => p > 0)
                    .When(i => i.ProductId.HasValue)
                    .WithMessage("برای کالای خارج از سند، قیمت واحد فاکتور تامین‌کننده الزامی است.");
                item.RuleFor(i => i.Discount).InclusiveBetween(0, 100)
                    .When(i => i.Discount.HasValue)
                    .WithMessage("تخفیف باید بین ۰ تا ۱۰۰ درصد باشد.");
            });
        }
    }

    public class AcceptPurchaseExcessCommandHandler : IRequestHandler<AcceptPurchaseExcessCommand, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IPurchaseReturnCalculationService _purchaseReturnCalculationService;
        private readonly IProductUnitService _productUnitService;
        private readonly IInventoryCostingService _inventoryCostingService;
        private readonly IUnitOfWork _unitOfWork;

        public AcceptPurchaseExcessCommandHandler(IWMSDbContext context, IPurchaseReturnCalculationService purchaseReturnCalculationService, IProductUnitService productUnitService, IInventoryCostingService inventoryCostingService, IUnitOfWork unitOfWork)
        {
            _context = context;
            _purchaseReturnCalculationService = purchaseReturnCalculationService;
            _productUnitService = productUnitService;
            _inventoryCostingService = inventoryCostingService;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(AcceptPurchaseExcessCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var purchase = await _context.Purchases
                .Include(x => x.Items)
                .ThenInclude(x => x.Product)
                .FirstOrDefaultAsync(x => x.Id == request.PurchaseId && x.IsActive, cancellationToken)
                ?? throw new NotFoundCustomException("خرید مورد نظر یافت نشد.");

            if (purchase.Status == PurchaseStatusEnum.CANCELLED)
                throw new ValidationCustomException("خرید لغوشده قابل تغییر نیست.");

            var lines = purchase.Items.ToDictionary(x => x.Id);
            foreach (var item in request.Items.Where(i => i.PurchaseItemId.HasValue))
            {
                if (!lines.ContainsKey(item.PurchaseItemId!.Value))
                    throw new NotFoundCustomException("آیتم خرید مورد نظر یافت نشد.");
            }

            var unlistedProductIds = request.Items.Where(i => i.ProductId.HasValue).Select(i => i.ProductId!.Value).ToList();
            var unlistedProducts = await _context.Products
                .Where(p => unlistedProductIds.Contains(p.Id))
                .ToDictionaryAsync(p => p.Id, cancellationToken);
            if (unlistedProducts.Count != unlistedProductIds.Count)
                throw new NotFoundCustomException("کالای انتخاب‌شده یافت نشد.");

            // What may be accepted is what is held for that reason minus what open return claims already reserve - the same quota
            // an OFF_ORDER claim is capped by, so a unit can be either bought or claimed back, never both.
            var held = await _context.ProductUnits
                .Where(u => u.PurchaseId == purchase.Id && u.Status == ProductUnitStatusEnum.QUARANTINED
                    && (u.CustodyReason == UnitCustodyReasonEnum.EXCESS || u.CustodyReason == UnitCustodyReasonEnum.UNLISTED))
                .GroupBy(u => new { u.CustodyReason, u.PurchaseItemId, u.ProductId })
                .Select(g => new { g.Key.CustodyReason, g.Key.PurchaseItemId, g.Key.ProductId, Count = g.Count() })
                .ToListAsync(cancellationToken);

            var activeReturns = await _context.PurchaseReturns
                .Where(x => x.PurchaseId == purchase.Id)
                .WhereNotDeleted()
                .WhereOpen()
                .WithReturnGraph()
                .ToListAsync(cancellationToken);

            foreach (var item in request.Items)
            {
                var isExcess = item.PurchaseItemId.HasValue;
                var productId = isExcess ? lines[item.PurchaseItemId!.Value].ProductId : item.ProductId!.Value;
                var productName = isExcess ? lines[item.PurchaseItemId!.Value].Product.Name : unlistedProducts[productId].Name;

                var inQuarantine = isExcess
                    ? held.Where(h => h.CustodyReason == UnitCustodyReasonEnum.EXCESS && h.PurchaseItemId == item.PurchaseItemId).Sum(h => h.Count)
                    : held.Where(h => h.CustodyReason == UnitCustodyReasonEnum.UNLISTED && h.ProductId == productId).Sum(h => h.Count);
                var reserved = _purchaseReturnCalculationService.GetOutstandingOffOrderClaimQuantity(
                    isExcess ? ReturnOffScopeKindEnum.EXCESS : ReturnOffScopeKindEnum.UNLISTED, item.PurchaseItemId, productId, activeReturns);
                var available = Math.Max(0, inQuarantine - reserved);

                if (item.Quantity > available)
                    throw new ValidationCustomException(reserved > 0
                        ? $"از «{productName}» فقط {available} عدد {(isExcess ? "مازاد" : "خارج از سند")} در قرنطینه آزاد است؛ {reserved} عدد در ادعای مرجوعیِ باز رزرو شده."
                        : $"از «{productName}» فقط {available} عدد {(isExcess ? "مازاد" : "خارج از سند")} در قرنطینه‌ی این خرید هست.");
            }

            var now = DateTime.Now;
            var occurredAt = request.Date ?? now;
            var movement = new UnitMovementContext(ProductUnitMovementReasonEnum.PURCHASE_EXCESS_ACCEPTED, occurredAt, DocumentKindEnum.PURCHASE, purchase.Id, SupplierId: purchase.SupplierId, Note: request.Note);

            res.Data = await _unitOfWork.ExecuteInTransactionAsync(async ct =>
            {
                // Every supplement line needs to exist - with an id - before the units move: every unit movement row snapshots
                // the unit's line. Saved inside the transaction, so a unit-level refusal below rolls the new lines back too.
                var targets = new List<(AcceptPurchaseExcessItemDto Request, Domain.Entities.PurchaseItem Line, UnitSelection Selection)>();
                foreach (var item in request.Items)
                {
                    if (item.PurchaseItemId.HasValue)
                    {
                        var ordered = lines[item.PurchaseItemId.Value];
                        var line = new Domain.Entities.PurchaseItem
                        {
                            ProductId = ordered.ProductId,
                            Product = ordered.Product,
                            Quantity = item.Quantity,
                            ReceivedQuantity = item.Quantity,
                            UnitPrice = ordered.UnitPrice,
                            Discount = ordered.Discount,
                            // Same invoice, same terms: the ordered line's tax snapshot, not the product's current rate.
                            TaxCategory = ordered.TaxCategory,
                            TaxPercent = ordered.TaxPercent,
                            IsSupplement = true,
                            SupplementOfPurchaseItemId = ordered.Id,
                        };
                        InvoiceLineMath.Recompute(line);
                        purchase.Items.Add(line);
                        // The units are held on the ORDERED line; they move to the supplement line as they are accepted.
                        targets.Add((item, line, new UnitSelection(ProductUnitStatusEnum.QUARANTINED, purchase.Id, ordered.Id, UnitCustodyReasonEnum.EXCESS)));
                    }
                    else
                    {
                        var product = unlistedProducts[item.ProductId!.Value];
                        var line = new Domain.Entities.PurchaseItem
                        {
                            ProductId = product.Id,
                            Product = product,
                            Quantity = item.Quantity,
                            ReceivedQuantity = item.Quantity,
                            UnitPrice = item.UnitPrice!.Value,
                            Discount = item.Discount ?? 0,
                            IsSupplement = true,
                        };
                        InvoiceLineMath.Stamp(line, product);
                        purchase.Items.Add(line);
                        targets.Add((item, line, new UnitSelection(ProductUnitStatusEnum.QUARANTINED, purchase.Id, null, UnitCustodyReasonEnum.UNLISTED)));
                    }
                }

                await _unitOfWork.SaveChangesAsync(ct);

                var accepted = new List<object>();
                foreach (var (item, line, selection) in targets)
                {
                    var product = line.Product;
                    var units = await _productUnitService.AcceptExcessAsync(product, item.Quantity, selection, item.ProductUnitBarcodes, line.Id, movement, ct);
                    product.Stock += item.Quantity;

                    var heldValue = units.Sum(u => u.QuarantineCost ?? 0m);
                    await _inventoryCostingService.RecordPurchaseExcessAcceptedAsync(product, item.Quantity, line.UnitPrice, line.Discount, heldValue, line.Id, occurredAt, ct);

                    // The invoice grows by the line total, tax included; the cost pool above takes the net price only.
                    var lineAmount = line.TotalAmount;
                    purchase.TotalAmount = checked(purchase.TotalAmount + lineAmount);
                    await PartyLedger.PurchaseSupplementAsync(_context, purchase, lineAmount, occurredAt, ct);

                    accepted.Add(new
                    {
                        PurchaseItemId = line.Id,
                        line.SupplementOfPurchaseItemId,
                        line.ProductId,
                        AcceptedQuantity = item.Quantity,
                        line.Quantity,
                        line.ReceivedQuantity,
                        line.UnitPrice,
                        line.Discount,
                        Amount = lineAmount,
                    });
                }

                purchase.Status = _purchaseReturnCalculationService.RecomputePurchaseStatus(purchase);
                purchase.UpdatedAt = now;

                await _unitOfWork.SaveChangesAsync(ct);

                return (object)new
                {
                    PurchaseId = purchase.Id,
                    PurchaseStatus = purchase.Status,
                    purchase.TotalAmount,
                    purchase.PaidAmount,
                    Items = accepted,
                };
            }, cancellationToken);

            res.Message = "کالای مازاد به خرید اضافه شد و وارد موجودی شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
