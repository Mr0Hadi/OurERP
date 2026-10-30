using Application.Common.Audit;
using Application.Common.Contracts.Context;
using Application.Common.Contracts.InventoryCosting;
using Application.Common.Contracts.ProductCode;
using Application.Common.Contracts.ProductUnit;
using Application.Common.Contracts.SaleReturn;
using Application.Common.Contracts.Settings;
using Application.Common.Contracts.Storage;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Contracts.UserContextService;
using Application.Common.Documents;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Common.Sales;
using Application.Common.Settings;
using Application.Features.Sale.Queries;
using Common.Exceptions;
using Common.Extensions;
using Domain.Entities;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Sale.Commands
{
    /// <summary>
    /// The warehouse's check of a customer-approved proforma (docs/proforma-approval-pipeline.md). The employee scans every
    /// unit they pick for each line; the scanned units are RESERVED for that line and leave Product.Stock. Lines still fully
    /// reserved from an earlier check need no scan. A line of a product that does not require unit tracking may be sent with
    /// no barcodes: the server then reserves its oldest free units (FIFO by serial - which physical unit, not a costing
    /// method; a reservation writes nothing to the cost ledger), or records a shortage when there are not enough
    /// (frontend-requests 29.1).
    ///
    /// A unit found damaged, defective, expired or missing is reported in <see cref="Issues"/>: the exact unit barcode, a reason
    /// and a mandatory description, with the employee and time recorded. It goes to quarantine (custody WAREHOUSE_HOLD, at the
    /// running average, exactly like ApplyProductUnitAction QUARANTINE) and lands in accounting's list - it never holds the
    /// proforma back. If a healthy replacement exists the employee simply scans it.
    ///
    /// Outcome: every line covered -> WAREHOUSE_CHECKED (the customer may pay). Any line short -> nothing is reserved, the
    /// shortage is recorded and the proforma goes back to DRAFT for sales and the customer; reported issues stand either way.
    /// All or nothing otherwise: any refusal leaves stock and units as they were.
    ///
    /// A successful check sets Sale.ReservationExpiresAt from the Sale.ReservationMinutes setting (default 10, 0 = never):
    /// past it payment is refused and the background sweep (ReleaseExpiredSaleReservationCommand) puts the units back.
    ///
    /// <see cref="Adjustments"/> lets the warehouse lower a line's quantity (0 removes the line) when fewer goods exist, and
    /// approve what is left in the same call instead of sending the proforma back. A note is then required; prices and discounts
    /// stay, the totals are recomputed, the revision goes up, the changed lines lose their earlier reservations and are checked
    /// at their new quantity. Every remaining line must then be fully scanned - an adjusted check never records a shortage. One
    /// WAREHOUSE_ADJUSTED event names the quantities before and after. A proforma carrying an installment plan refuses any change
    /// to its total, as UpdateSale does.
    /// </summary>
    [AuditAction(AuditActionEnum.CheckSaleWarehouse)]
    public class CheckSaleWarehouseCommand : IRequest<ResponseDto>
    {
        public int SaleId { get; set; }

        /// <summary>The revision the warehouse screen showed (SaleDto.Revision).</summary>
        public int Revision { get; set; }

        /// <summary>Scanned units per line. A line that is not listed, or listed with fewer units than it still needs, is a shortage.</summary>
        public List<CheckSaleWarehouseLineDto> Lines { get; set; } = new();

        /// <summary>Units found unfit to sell. Rare; each one strictly named.</summary>
        public List<SaleWarehouseIssueInputDto> Issues { get; set; } = new();

        /// <summary>Lines the warehouse lowers before approving. Only ever down; 0 removes the line. Requires <see cref="Note"/>.</summary>
        public List<SaleWarehouseAdjustmentDto> Adjustments { get; set; } = new();

        public string? Note { get; set; }
    }

    public class SaleWarehouseAdjustmentDto
    {
        public int SaleItemId { get; set; }

        /// <summary>The line's new quantity: below its current one, 0 = remove the line.</summary>
        public int Quantity { get; set; }
    }

    public class CheckSaleWarehouseLineDto
    {
        public int SaleItemId { get; set; }
        public List<string> ProductUnitBarcodes { get; set; } = new();
    }

    public class SaleWarehouseIssueInputDto
    {
        /// <summary>The unit's barcode - scanned, or for a MISSING unit picked from the product's IN_STOCK units.</summary>
        public string ProductUnitBarcode { get; set; } = string.Empty;
        public UnitActionReasonEnum Reason { get; set; }
        public string Description { get; set; } = string.Empty;
    }

    public class CheckSaleWarehouseCommandValidator : AbstractValidator<CheckSaleWarehouseCommand>
    {
        public CheckSaleWarehouseCommandValidator()
        {
            RuleFor(x => x.SaleId).GreaterThan(0).WithMessage("فروش نامعتبر است.");
            RuleFor(x => x.Lines).Must(l => l.Select(i => i.SaleItemId).Distinct().Count() == l.Count)
                .WithMessage("هر قلم فروش فقط یک‌بار می‌آید.");
            RuleFor(x => x.Note).MaximumLength(1000).WithMessage("یادداشت حداکثر ۱۰۰۰ نویسه است.");
            RuleFor(x => x.Note).Must(n => !string.IsNullOrWhiteSpace(n))
                .When(x => x.Adjustments.Count > 0)
                .WithMessage("برای تغییر تعداد اقلام، دلیل را در یادداشت بنویسید.");
            RuleFor(x => x.Adjustments).Must(a => a.Select(i => i.SaleItemId).Distinct().Count() == a.Count)
                .WithMessage("هر قلم فروش فقط یک‌بار تغییر می‌کند.");
            RuleForEach(x => x.Adjustments).ChildRules(a =>
            {
                a.RuleFor(x => x.Quantity).GreaterThanOrEqualTo(0).WithMessage("تعداد تازه نمی‌تواند منفی باشد.");
            });
            RuleForEach(x => x.Issues).ChildRules(i =>
            {
                i.RuleFor(x => x.ProductUnitBarcode).NotEmpty().WithMessage(Validation.RequiredMessage("بارکد دانه"));
                i.RuleFor(x => x.Reason).IsInEnum().NotEqual(UnitActionReasonEnum.INSPECTION_PASSED)
                    .WithMessage("وضعیت گزارش‌شده نامعتبر است.");
                i.RuleFor(x => x.Description).Must(d => !string.IsNullOrWhiteSpace(d))
                    .WithMessage("برای هر کالای معیوب یا مفقود، شرح وضعیت الزامی است.");
                i.RuleFor(x => x.Description).MaximumLength(1000).WithMessage("شرح حداکثر ۱۰۰۰ نویسه است.");
            });
        }
    }

    public class CheckSaleWarehouseCommandHandler : IRequestHandler<CheckSaleWarehouseCommand, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IProductUnitService _productUnitService;
        private readonly IProductCodeService _productCodeService;
        private readonly IInventoryCostingService _inventoryCostingService;
        private readonly IObjectStorageService _objectStorageService;
        private readonly ISaleReturnCalculationService _saleReturnCalculationService;
        private readonly IUserContextService _userContextService;
        private readonly ISystemSettingService _systemSettingService;
        private readonly IUnitOfWork _unitOfWork;

        public CheckSaleWarehouseCommandHandler(IWMSDbContext context, IProductUnitService productUnitService, IProductCodeService productCodeService, IInventoryCostingService inventoryCostingService, IObjectStorageService objectStorageService, ISaleReturnCalculationService saleReturnCalculationService, IUserContextService userContextService, ISystemSettingService systemSettingService, IUnitOfWork unitOfWork)
        {
            _systemSettingService = systemSettingService;
            _context = context;
            _productUnitService = productUnitService;
            _productCodeService = productCodeService;
            _inventoryCostingService = inventoryCostingService;
            _objectStorageService = objectStorageService;
            _saleReturnCalculationService = saleReturnCalculationService;
            _userContextService = userContextService;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(CheckSaleWarehouseCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var sale = await _context.Sales
                .Include(x => x.Items).ThenInclude(x => x.Product)
                .FirstOrDefaultAsync(x => x.Id == request.SaleId && x.IsActive, cancellationToken)
                ?? throw new NotFoundCustomException("فروش مورد نظر یافت نشد.");

            if (sale.Status != SalesStatusEnum.PROFORMA)
                throw new ValidationCustomException("فقط پیش‌فاکتور بررسی انبار می‌شود.");
            if (sale.ProformaStage != SaleProformaStageEnum.CUSTOMER_APPROVED)
                throw new ValidationCustomException(sale.ProformaStage == SaleProformaStageEnum.DRAFT
                    ? "این پیش‌فاکتور هنوز تأیید مشتری را نگرفته است."
                    : "انبار این پیش‌فاکتور را قبلاً تأیید کرده است.");
            SaleProformaPipeline.EnsureRevision(sale, request.Revision);

            var lines = sale.Items.ToDictionary(x => x.Id);
            if (request.Lines.Any(l => !lines.ContainsKey(l.SaleItemId)) || request.Adjustments.Any(a => !lines.ContainsKey(a.SaleItemId)))
                throw new NotFoundCustomException("قلم فروش مورد نظر در این پیش‌فاکتور یافت نشد.");

            var userId = int.TryParse(_userContextService.GetUserId(), out var id) ? id : (int?)null;
            var now = DateTime.Now;

            // ── Checks first. ──────────────────────────────────────────────────────────────────────────────────────
            // Issues are resolved against the proforma as it came in: a damaged unit is often why a line is lowered or removed.
            var issueUnits = await ResolveIssueUnitsAsync(request.Issues, sale, cancellationToken);

            var adjustedNote = await ApplyAdjustmentsAsync(request, sale, lines, cancellationToken);
            var adjusted = adjustedNote != null;

            var scanned = request.Lines.ToDictionary(l => l.SaleItemId, l => l.ProductUnitBarcodes ?? new());
            var reportedPayloads = issueUnits.Select(u => u.Unit.BarcodePayload).ToHashSet();
            if (scanned.Values.SelectMany(b => b).Select(_productCodeService.ToPayload).Any(reportedPayloads.Contains))
                throw new ValidationCustomException("دانه‌ای که معیوب یا مفقود گزارش شده نمی‌تواند برای فروش اسکن شود.");

            // Free units of each product not already spoken for in this request: the shelf (Stock) minus the units reported
            // in Issues and the units scanned for any line. What is left is what a line sent without barcodes can be given.
            var scannedPerProduct = sale.Items
                .GroupBy(l => l.ProductId)
                .ToDictionary(g => g.Key, g => g.Sum(l => scanned.TryGetValue(l.Id, out var b) ? b.Count : 0));
            var freeLeft = sale.Items.Select(l => l.Product).DistinctBy(p => p.Id).ToDictionary(
                p => p.Id,
                p => p.Stock - issueUnits.Count(u => u.Product.Id == p.Id) - scannedPerProduct[p.Id]);

            var shortages = new List<string>();
            var toReserve = new List<(SaleItem Line, int Count, List<string>? Barcodes)>();
            foreach (var line in sale.Items)
            {
                var reserved = await _productUnitService.CountReservedAsync(line.Id, cancellationToken);
                var needed = line.Quantity - reserved;
                var barcodes = scanned.TryGetValue(line.Id, out var b) ? b : new();

                if (barcodes.Count > needed)
                    throw new ValidationCustomException(needed <= 0
                        ? $"کالای «{line.Product.Name}» از قبل رزرو است و اسکن تازه لازم ندارد."
                        : $"برای «{line.Product.Name}» {needed} دانه لازم است، {barcodes.Count} دانه اسکن شده.");

                if (needed <= 0)
                    continue;

                // A product that does not require unit tracking (bulk goods with no label on each unit) may be approved by
                // quantity alone: the server reserves its oldest free units, as shipping already does (frontend-requests 29.1).
                if (barcodes.Count == 0 && !line.Product.RequiresUnitTracking)
                {
                    var free = Math.Max(0, freeLeft[line.ProductId]);
                    if (free < needed)
                        shortages.Add($"«{line.Product.Name}»: {free + reserved} از {line.Quantity}");
                    else
                    {
                        freeLeft[line.ProductId] -= needed;
                        toReserve.Add((line, needed, null));
                    }
                    continue;
                }

                if (barcodes.Count < needed)
                    shortages.Add($"«{line.Product.Name}»: {barcodes.Count + reserved} از {line.Quantity}");
                else
                    toReserve.Add((line, needed, barcodes));
            }

            // ── Reported units go to quarantine whatever the outcome: they are facts about the shelf. ─────────────
            foreach (var (input, unit, product) in issueUnits)
            {
                var cost = await _inventoryCostingService.RecordStockQuarantinedAsync(product, 1, now, cancellationToken);
                product.Stock -= 1;
                await _productUnitService.ApplyActionAsync(new[] { unit }, ProductUnitActionEnum.QUARANTINE, cost,
                    new UnitMovementContext(ProductUnitMovementReasonEnum.STOCK_QUARANTINED, now, DocumentKindEnum.SALE, sale.Id,
                        CustomerId: sale.CustomerId, Note: input.Description.Trim(), ActionReason: input.Reason),
                    cancellationToken);

                await _context.SaleWarehouseIssues.AddAsync(new SaleWarehouseIssue
                {
                    SaleId = sale.Id,
                    ProductId = product.Id,
                    ProductUnit = unit,
                    ProductUnitId = unit.Id,
                    Reason = input.Reason,
                    Description = input.Description.Trim(),
                    ReportedByUserId = userId,
                    ReportedAt = now,
                }, cancellationToken);
            }

            if (shortages.Count > 0 && adjusted)
                throw new ValidationCustomException("پس از تغییر تعداد، همه‌ی اقلام باقی‌مانده باید کامل اسکن شوند: " + string.Join("، ", shortages));

            if (shortages.Count > 0)
            {
                var note = "کسری انبار - " + string.Join("، ", shortages)
                    + (string.IsNullOrWhiteSpace(request.Note) ? string.Empty : $". {request.Note.Trim()}");
                await SaleProformaPipeline.RecordAsync(_context, sale, SaleProformaEventEnum.WAREHOUSE_SHORTAGE, SaleProformaStageEnum.DRAFT, userId, note, cancellationToken);
                res.Message = "کسری ثبت شد و پیش‌فاکتور برای اصلاح با مشتری به فروش برگشت.";
            }
            else
            {
                foreach (var (line, count, barcodes) in toReserve)
                {
                    var units = await _productUnitService.ReserveAsync(line.Product, line.Id, count, barcodes,
                        new UnitMovementContext(ProductUnitMovementReasonEnum.SALE_RESERVED, now, DocumentKindEnum.SALE, sale.Id, CustomerId: sale.CustomerId),
                        cancellationToken);
                    line.Product.Stock -= units.Count;
                }

                if (adjusted)
                    await SaleProformaPipeline.RecordAsync(_context, sale, SaleProformaEventEnum.WAREHOUSE_ADJUSTED, SaleProformaStageEnum.WAREHOUSE_CHECKED, userId,
                        adjustedNote, cancellationToken);
                else
                    await SaleProformaPipeline.RecordAsync(_context, sale, SaleProformaEventEnum.WAREHOUSE_CHECKED, SaleProformaStageEnum.WAREHOUSE_CHECKED, userId,
                        string.IsNullOrWhiteSpace(request.Note) ? null : request.Note.Trim(), cancellationToken);

                // Every successful check starts the clock afresh - lines kept from an earlier check included.
                var minutes = await _systemSettingService.GetIntegerAsync(SystemSettingCatalog.SaleReservationMinutes, cancellationToken);
                sale.ReservationExpiresAt = SaleProformaPipeline.ReservationDeadline(now, minutes);
                res.Message = (adjusted ? "انبار تعداد اقلام را اصلاح کرد و " : "انبار ") + "کالا را تأیید و رزرو کرد؛ پیش‌فاکتور آماده‌ی پرداخت است."
                    + (minutes > 0 ? $" رزرو {minutes} دقیقه معتبر است." : string.Empty);
            }

            if (issueUnits.Count > 0)
                res.Message += $" {issueUnits.Count} دانه‌ی گزارش‌شده به قرنطینه رفت و برای رسیدگی به حسابداری اعلام شد.";

            sale.UpdatedAt = now;
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Data = await SaleDetailReader.ReadAsync(_context, _objectStorageService, _saleReturnCalculationService, sale.Id, cancellationToken);
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }

        /// <summary>
        /// Lowers the requested lines before the check: their earlier reservations go back on the shelf (they are checked again at
        /// the new quantity), a 0 removes the line, amounts and the total are recomputed and the revision goes up. Returns the
        /// WAREHOUSE_ADJUSTED event note (quantities before and after, then the employee's reason), or null when nothing changed.
        /// </summary>
        private async Task<string?> ApplyAdjustmentsAsync(CheckSaleWarehouseCommand request, Domain.Entities.Sale sale, Dictionary<int, SaleItem> lines, CancellationToken cancellationToken)
        {
            if (request.Adjustments.Count == 0)
                return null;

            foreach (var adjustment in request.Adjustments)
            {
                var line = lines[adjustment.SaleItemId];
                if (adjustment.Quantity >= line.Quantity)
                    throw new ValidationCustomException($"انبار فقط می‌تواند تعداد «{line.Product.Name}» را کم کند؛ تعداد فعلی {line.Quantity} است.");
            }

            var removed = request.Adjustments.Where(a => a.Quantity == 0).Select(a => a.SaleItemId).ToHashSet();
            if (sale.Items.All(l => removed.Contains(l.Id)))
                throw new ValidationCustomException("دست‌کم یک قلم باید در پیش‌فاکتور بماند؛ برای کنار گذاشتن کل پیش‌فاکتور آن را حذف کنید.");

            var removedScanned = request.Lines.FirstOrDefault(l => removed.Contains(l.SaleItemId) && (l.ProductUnitBarcodes?.Count ?? 0) > 0);
            if (removedScanned != null)
                throw new ValidationCustomException($"قلم «{lines[removedScanned.SaleItemId].Product.Name}» حذف می‌شود و اسکن لازم ندارد.");

            await SaleProformaPipeline.ReleaseAsync(_context, _productUnitService, sale, request.Adjustments.Select(a => a.SaleItemId), cancellationToken);

            var changes = new List<string>();
            foreach (var adjustment in request.Adjustments)
            {
                var line = lines[adjustment.SaleItemId];
                changes.Add($"«{line.Product.Name}»: {line.Quantity} به {adjustment.Quantity}");
                if (adjustment.Quantity == 0)
                {
                    sale.Items.Remove(line);
                    continue;
                }

                line.Quantity = adjustment.Quantity;
                // The line keeps its own price, discount and tax snapshot; only the quantity changed.
                InvoiceLineMath.Recompute(line);
            }

            var total = InvoiceLineMath.DocumentTotal(sale.Items);
            if (total != sale.TotalAmount && await _context.SaleInstallmentPlans.AnyAsync(
                    p => p.SaleId == sale.Id && p.IsActive && p.Status == SaleInstallmentPlanStatusEnum.ACTIVE, cancellationToken))
                throw new ValidationCustomException("این پیش‌فاکتور قرارداد اقساطی دارد و جمع آن نمی‌تواند عوض شود؛ ابتدا قرارداد را حذف کنید.");

            sale.TotalAmount = total;
            sale.Revision++;

            return "تغییر انبار - " + string.Join("، ", changes) + ". " + request.Note!.Trim();
        }

        /// <summary>
        /// Each reported barcode must name one known IN_STOCK unit of a product on this proforma, at most once. The product's
        /// Stock must still cover the units taken off it (the same check ApplyProductUnitAction makes).
        /// </summary>
        private async Task<List<(SaleWarehouseIssueInputDto Input, Domain.Entities.ProductUnit Unit, Domain.Entities.Product Product)>> ResolveIssueUnitsAsync(
            List<SaleWarehouseIssueInputDto> issues, Domain.Entities.Sale sale, CancellationToken cancellationToken)
        {
            var result = new List<(SaleWarehouseIssueInputDto, Domain.Entities.ProductUnit, Domain.Entities.Product)>();
            if (issues.Count == 0)
                return result;

            var products = sale.Items.Select(i => i.Product).DistinctBy(p => p.Id).ToDictionary(p => p.Id);
            var seen = new HashSet<string>();

            foreach (var issue in issues)
            {
                var payload = _productCodeService.ToPayload(issue.ProductUnitBarcode);
                if (!seen.Add(payload))
                    throw new ValidationCustomException("یک دانه بیش از یک‌بار گزارش شده است.");

                var unit = await _context.ProductUnits.FirstOrDefaultAsync(x => x.BarcodePayload == payload && x.IsActive, cancellationToken)
                    ?? throw new NotFoundCustomException($"بارکد «{issue.ProductUnitBarcode}» در سیستم یافت نشد.");

                if (!products.TryGetValue(unit.ProductId, out var product))
                    throw new ValidationCustomException($"بارکد «{unit.Barcode}» مربوط به کالاهای این پیش‌فاکتور نیست.");

                if (unit.Status != ProductUnitStatusEnum.IN_STOCK)
                    throw new ValidationCustomException(unit.Status == ProductUnitStatusEnum.RESERVED
                        ? $"دانه‌ی «{unit.Barcode}» برای پیش‌فاکتور دیگری رزرو شده؛ گزارش آن از مسیر همان پیش‌فاکتور یا صفحه‌ی دانه‌ها است."
                        : $"دانه‌ی «{unit.Barcode}» در موجودی انبار نیست.");

                result.Add((issue, unit, product));
            }

            foreach (var group in result.GroupBy(x => x.Item3.Id))
            {
                var product = products[group.Key];
                if (product.Stock < group.Count())
                    throw new ValidationCustomException($"موجودی «{product.Name}» با دانه‌های آن هماهنگ نیست؛ اول موجودی را اصلاح کنید.");
            }

            return result;
        }
    }
}
