using Application.Common.Contracts.Context;
using Application.Common.Contracts.InventoryCosting;
using Application.Common.Contracts.ProductUnit;
using Application.Common.Contracts.PurchaseReturn;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Common.Queries;
using Common.Exceptions;
using Common.Extensions;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Product.Commands
{
    /// <summary>
    /// A warehouse decision about specific units, with no document or counterparty behind it (2026-09-27): take units off the shelf
    /// into quarantine, put quarantined units back on the shelf, or scrap units from either place. It is the second step of every
    /// quarantine - defective goods found at receiving, excess we bought or keep for free, defects a customer brought back, and
    /// goods the warehouse held itself - so none of them needs a purchase return just to be released or scrapped. Sending goods back
    /// to the supplier stays a purchase return: that has a counterparty and money.
    ///
    /// Every unit moves at the value it carries (ProductUnit.QuarantineCost), never a typed number: released units enter the pool at
    /// it, scrapped quarantine is a loss of it, and units put into quarantine carry the running average they left the pool at.
    /// Units a purchase-return decision has reserved (IPurchaseReturnCalculationService.GetReservedQuarantineQuantity) cannot be
    /// released or scrapped here. All or nothing.
    /// </summary>
    public class ApplyProductUnitActionCommand : IRequest<ResponseDto>
    {
        public ProductUnitActionEnum Action { get; set; }
        public List<int> ProductUnitIds { get; set; } = new();
        public UnitActionReasonEnum Reason { get; set; }
        public string? Note { get; set; }

        /// <summary>When it happened; defaults to now.</summary>
        public DateTime? OccurredAt { get; set; }
    }

    public class ApplyProductUnitActionCommandValidator : AbstractValidator<ApplyProductUnitActionCommand>
    {
        public const int MaxUnits = 2000;

        public ApplyProductUnitActionCommandValidator()
        {
            RuleFor(x => x.Action).IsInEnum().WithMessage("کار انتخاب‌شده نامعتبر است.");
            RuleFor(x => x.Reason).IsInEnum().WithMessage("علت انتخاب‌شده نامعتبر است.");
            RuleFor(x => x.ProductUnitIds).NotEmpty().WithMessage(Validation.RequiredMessage("دانه‌ها"));
            RuleFor(x => x.ProductUnitIds).Must(ids => ids.Count <= MaxUnits)
                .WithMessage($"در هر درخواست حداکثر {MaxUnits} دانه.");
            RuleFor(x => x.ProductUnitIds).Must(ids => ids.Distinct().Count() == ids.Count)
                .WithMessage("یک دانه بیش از یک‌بار انتخاب شده است.");
            RuleFor(x => x.Note).MaximumLength(500).WithMessage("یادداشت حداکثر ۵۰۰ نویسه است.");
            // Scrap is a financial loss, and "other" says nothing on its own.
            RuleFor(x => x.Note).Must(n => !string.IsNullOrWhiteSpace(n))
                .WithMessage("برای اسقاط، و برای علتِ «سایر موارد»، یادداشت لازم است.")
                .When(x => x.Action == ProductUnitActionEnum.SCRAP || x.Reason == UnitActionReasonEnum.OTHER);
        }
    }

    public class ApplyProductUnitActionCommandHandler : IRequestHandler<ApplyProductUnitActionCommand, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IProductUnitService _productUnitService;
        private readonly IInventoryCostingService _inventoryCostingService;
        private readonly IPurchaseReturnCalculationService _purchaseReturnCalculationService;
        private readonly IUnitOfWork _unitOfWork;

        public ApplyProductUnitActionCommandHandler(IWMSDbContext context, IProductUnitService productUnitService, IInventoryCostingService inventoryCostingService, IPurchaseReturnCalculationService purchaseReturnCalculationService, IUnitOfWork unitOfWork)
        {
            _context = context;
            _productUnitService = productUnitService;
            _inventoryCostingService = inventoryCostingService;
            _purchaseReturnCalculationService = purchaseReturnCalculationService;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(ApplyProductUnitActionCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var units = await _context.ProductUnits
                .Where(u => request.ProductUnitIds.Contains(u.Id) && u.IsActive)
                .ToListAsync(cancellationToken);
            if (units.Count != request.ProductUnitIds.Count)
                throw new NotFoundCustomException("یک یا چند دانه‌ی انتخاب‌شده یافت نشد.");

            // ── Checks first, then writes: a refusal leaves everything as it was. ─────────────────────────────────
            var wrongStatus = units.Where(u => !Allowed(request.Action, u.Status)).ToList();
            if (wrongStatus.Count > 0)
                throw new ValidationCustomException(WrongStatusMessage(request.Action, wrongStatus));

            var leavingQuarantine = request.Action != ProductUnitActionEnum.QUARANTINE
                ? units.Where(u => u.Status == ProductUnitStatusEnum.QUARANTINED).ToList()
                : new();

            // Goods nobody paid for: releasing makes them free stock, scrapping writes nothing off. Both are legitimate, but they
            // must be said on purpose - a supplier bill that arrives later has nowhere to land once the units are gone.
            if (leavingQuarantine.Any(u => u.CustodyReason is UnitCustodyReasonEnum.EXCESS or UnitCustodyReasonEnum.UNLISTED)
                && string.IsNullOrWhiteSpace(request.Note))
                throw new ValidationCustomException("این کالا پرداخت‌نشده است و بدون پرداخت وارد/خارج می‌شود؛ یادداشت لازم است. اگر تامین‌کننده بابت آن پول می‌خواهد، اول «قبول مازاد» را بزنید.");

            await EnsureNotReservedAsync(leavingQuarantine, cancellationToken);

            var productIds = units.Select(u => u.ProductId).Distinct().ToList();
            var products = await _context.Products.Where(p => productIds.Contains(p.Id)).ToDictionaryAsync(p => p.Id, cancellationToken);

            foreach (var group in units.Where(u => u.Status == ProductUnitStatusEnum.IN_STOCK).GroupBy(u => u.ProductId))
            {
                if (products[group.Key].Stock < group.Count())
                    throw new ValidationCustomException($"موجودی «{products[group.Key].Name}» با دانه‌های آن هماهنگ نیست؛ اول موجودی را اصلاح کنید.");
            }

            // ── Apply. ─────────────────────────────────────────────────────────────────────────────────────────────
            var occurredAt = request.OccurredAt ?? DateTime.Now;
            UnitMovementContext Movement(ProductUnitMovementReasonEnum reason) =>
                new(reason, occurredAt, Note: request.Note, ActionReason: request.Reason);

            foreach (var group in units.GroupBy(u => (u.ProductId, u.Status)))
            {
                var product = products[group.Key.ProductId];
                var batch = group.ToList();
                var count = batch.Count;
                var heldValue = batch.Sum(u => u.QuarantineCost ?? 0m);

                switch (request.Action)
                {
                    case ProductUnitActionEnum.QUARANTINE:
                    {
                        var cost = await _inventoryCostingService.RecordStockQuarantinedAsync(product, count, occurredAt, cancellationToken);
                        product.Stock -= count;
                        await _productUnitService.ApplyActionAsync(batch, request.Action, cost, Movement(ProductUnitMovementReasonEnum.STOCK_QUARANTINED), cancellationToken);
                        break;
                    }
                    case ProductUnitActionEnum.RELEASE:
                        await _inventoryCostingService.RecordQuarantineReleasedAsync(product, count, heldValue, null, occurredAt, cancellationToken);
                        product.Stock += count;
                        await _productUnitService.ApplyActionAsync(batch, request.Action, null, Movement(ProductUnitMovementReasonEnum.QUARANTINE_RELEASED), cancellationToken);
                        break;
                    case ProductUnitActionEnum.SCRAP when group.Key.Status == ProductUnitStatusEnum.QUARANTINED:
                        await _inventoryCostingService.RecordQuarantineScrappedAsync(product, count, heldValue, null, occurredAt, cancellationToken);
                        await _productUnitService.ApplyActionAsync(batch, request.Action, null, Movement(ProductUnitMovementReasonEnum.QUARANTINE_SCRAPPED), cancellationToken);
                        break;
                    case ProductUnitActionEnum.SCRAP:
                        await _inventoryCostingService.RecordStockScrappedAsync(product, count, null, occurredAt, cancellationToken);
                        product.Stock -= count;
                        await _productUnitService.ApplyActionAsync(batch, request.Action, null, Movement(ProductUnitMovementReasonEnum.STOCK_SCRAPPED), cancellationToken);
                        break;
                }
            }

            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Data = new { AffectedCount = units.Count };
            res.Message = "کار روی دانه‌ها با موفقیت ثبت شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }

        private static bool Allowed(ProductUnitActionEnum action, ProductUnitStatusEnum status) => action switch
        {
            ProductUnitActionEnum.QUARANTINE => status == ProductUnitStatusEnum.IN_STOCK,
            ProductUnitActionEnum.RELEASE => status == ProductUnitStatusEnum.QUARANTINED,
            ProductUnitActionEnum.SCRAP => status is ProductUnitStatusEnum.IN_STOCK or ProductUnitStatusEnum.QUARANTINED,
            _ => false,
        };

        private static string WrongStatusMessage(ProductUnitActionEnum action, List<Domain.Entities.ProductUnit> units)
        {
            var sample = string.Join("، ", units.Take(5).Select(u => u.Barcode));
            var more = units.Count > 5 ? $" و {units.Count - 5} دانه‌ی دیگر" : string.Empty;
            var rule = action switch
            {
                ProductUnitActionEnum.QUARANTINE => "فقط دانه‌ی «در انبار» به قرنطینه می‌رود",
                ProductUnitActionEnum.RELEASE => "فقط دانه‌ی «قرنطینه» به موجودی برمی‌گردد",
                _ => "فقط دانه‌ی «در انبار» یا «قرنطینه» اسقاط می‌شود",
            };
            return $"{rule}: {sample}{more}.";
        }

        /// <summary>
        /// Quarantined units a purchase return is counting on (a pending release, scrap or return from quarantine, or an EXCESS/UNLISTED
        /// claim) must stay. Reservations are counts per quarantine group, not particular units, so any units of a group may go as long
        /// as no more than its free count do. Units with no purchase behind them are never reserved.
        /// </summary>
        private async Task EnsureNotReservedAsync(List<Domain.Entities.ProductUnit> leaving, CancellationToken cancellationToken)
        {
            var grouped = leaving
                .Select(u => (unit: u, selection: GroupOf(u)))
                .Where(x => x.selection != null)
                .GroupBy(x => (x.selection!, x.unit.ProductId))
                .ToList();

            if (grouped.Count == 0)
                return;

            var purchaseIds = grouped.Select(g => g.Key.Item1.PurchaseId!.Value).Distinct().ToList();
            var openReturns = await _context.PurchaseReturns
                .Where(x => purchaseIds.Contains(x.PurchaseId))
                .WhereNotDeleted()
                .WhereOpen()
                .WithReturnGraph()
                .AsNoTracking()
                .ToListAsync(cancellationToken);

            foreach (var group in grouped)
            {
                var (selection, productId) = group.Key;
                var purchaseId = selection.PurchaseId!.Value;
                var returns = openReturns.Where(r => r.PurchaseId == purchaseId).ToList();

                var held = await _context.ProductUnits.CountAsync(selection.ToFilter(productId), cancellationToken);
                var reserved = _purchaseReturnCalculationService.GetReservedQuarantineQuantity(selection, productId, purchaseId, returns);
                var free = Math.Max(0, held - reserved);

                if (group.Count() > free)
                {
                    var numbers = string.Join("، ", returns.Select(r => r.ReturnNumber));
                    throw new ValidationCustomException(
                        $"از این دسته‌ی قرنطینه فقط {free} دانه آزاد است؛ {reserved} دانه برای مرجوعی خرید ({numbers}) رزرو شده. آن مرجوعی را اجرا یا تصمیمش را اصلاح کنید.");
                }
            }
        }

        /// <summary>The quarantine group a unit is reserved in - the same groups PurchaseReturnQuarantine.For builds for claims.</summary>
        private static UnitSelection? GroupOf(Domain.Entities.ProductUnit unit)
        {
            if (unit.PurchaseId is not int purchaseId)
                return null;

            return unit.CustodyReason switch
            {
                UnitCustodyReasonEnum.ON_ORDER or UnitCustodyReasonEnum.CUSTOMER_RETURN or UnitCustodyReasonEnum.WAREHOUSE_HOLD when unit.PurchaseItemId.HasValue
                    => new UnitSelection(ProductUnitStatusEnum.QUARANTINED, purchaseId, unit.PurchaseItemId, UnitCustodyReasonEnum.ON_ORDER, IncludeLineHolds: true),
                UnitCustodyReasonEnum.EXCESS when unit.PurchaseItemId.HasValue
                    => new UnitSelection(ProductUnitStatusEnum.QUARANTINED, purchaseId, unit.PurchaseItemId, UnitCustodyReasonEnum.EXCESS),
                UnitCustodyReasonEnum.UNLISTED
                    => new UnitSelection(ProductUnitStatusEnum.QUARANTINED, purchaseId, null, UnitCustodyReasonEnum.UNLISTED),
                _ => null,
            };
        }
    }
}
