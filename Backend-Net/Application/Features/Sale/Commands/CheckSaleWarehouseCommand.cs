using Application.Common.Audit;
using Application.Common.Contracts.Context;
using Application.Common.Contracts.InventoryCosting;
using Application.Common.Contracts.ProductCode;
using Application.Common.Contracts.ProductUnit;
using Application.Common.Contracts.SaleReturn;
using Application.Common.Contracts.Storage;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Contracts.UserContextService;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Common.Sales;
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
    /// reserved from an earlier check need no scan.
    ///
    /// A unit found damaged, defective, expired or missing is reported in <see cref="Issues"/>: the exact unit barcode, a reason
    /// and a mandatory description, with the employee and time recorded. It goes to quarantine (custody WAREHOUSE_HOLD, at the
    /// running average, exactly like ApplyProductUnitAction QUARANTINE) and lands in accounting's list - it never holds the
    /// proforma back. If a healthy replacement exists the employee simply scans it.
    ///
    /// Outcome: every line covered -> WAREHOUSE_CHECKED (the customer may pay). Any line short -> nothing is reserved, the
    /// shortage is recorded and the proforma goes back to DRAFT for sales and the customer; reported issues stand either way.
    /// All or nothing otherwise: any refusal leaves stock and units as they were.
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

        public string? Note { get; set; }
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
        private readonly IUnitOfWork _unitOfWork;

        public CheckSaleWarehouseCommandHandler(IWMSDbContext context, IProductUnitService productUnitService, IProductCodeService productCodeService, IInventoryCostingService inventoryCostingService, IObjectStorageService objectStorageService, ISaleReturnCalculationService saleReturnCalculationService, IUserContextService userContextService, IUnitOfWork unitOfWork)
        {
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
            if (request.Lines.Any(l => !lines.ContainsKey(l.SaleItemId)))
                throw new NotFoundCustomException("قلم فروش مورد نظر در این پیش‌فاکتور یافت نشد.");

            var userId = int.TryParse(_userContextService.GetUserId(), out var id) ? id : (int?)null;
            var now = DateTime.Now;

            // ── Checks first. ──────────────────────────────────────────────────────────────────────────────────────
            var issueUnits = await ResolveIssueUnitsAsync(request.Issues, sale, cancellationToken);

            var scanned = request.Lines.ToDictionary(l => l.SaleItemId, l => l.ProductUnitBarcodes ?? new());
            var reportedPayloads = issueUnits.Select(u => u.Unit.BarcodePayload).ToHashSet();
            if (scanned.Values.SelectMany(b => b).Select(_productCodeService.ToPayload).Any(reportedPayloads.Contains))
                throw new ValidationCustomException("دانه‌ای که معیوب یا مفقود گزارش شده نمی‌تواند برای فروش اسکن شود.");

            var shortages = new List<string>();
            var toReserve = new List<(SaleItem Line, List<string> Barcodes)>();
            foreach (var line in sale.Items)
            {
                var reserved = await _productUnitService.CountReservedAsync(line.Id, cancellationToken);
                var needed = line.Quantity - reserved;
                var barcodes = scanned.TryGetValue(line.Id, out var b) ? b : new();

                if (barcodes.Count > needed)
                    throw new ValidationCustomException(needed <= 0
                        ? $"کالای «{line.Product.Name}» از قبل رزرو است و اسکن تازه لازم ندارد."
                        : $"برای «{line.Product.Name}» {needed} دانه لازم است، {barcodes.Count} دانه اسکن شده.");

                if (barcodes.Count < needed)
                    shortages.Add($"«{line.Product.Name}»: {barcodes.Count + reserved} از {line.Quantity}");
                else if (barcodes.Count > 0)
                    toReserve.Add((line, barcodes));
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

            if (shortages.Count > 0)
            {
                var note = "کسری انبار - " + string.Join("، ", shortages)
                    + (string.IsNullOrWhiteSpace(request.Note) ? string.Empty : $". {request.Note.Trim()}");
                await SaleProformaPipeline.RecordAsync(_context, sale, SaleProformaEventEnum.WAREHOUSE_SHORTAGE, SaleProformaStageEnum.DRAFT, userId, note, cancellationToken);
                res.Message = "کسری ثبت شد و پیش‌فاکتور برای اصلاح با مشتری به فروش برگشت.";
            }
            else
            {
                foreach (var (line, barcodes) in toReserve)
                {
                    var units = await _productUnitService.ReserveAsync(line.Product, line.Id, barcodes,
                        new UnitMovementContext(ProductUnitMovementReasonEnum.SALE_RESERVED, now, DocumentKindEnum.SALE, sale.Id, CustomerId: sale.CustomerId),
                        cancellationToken);
                    line.Product.Stock -= units.Count;
                }

                await SaleProformaPipeline.RecordAsync(_context, sale, SaleProformaEventEnum.WAREHOUSE_CHECKED, SaleProformaStageEnum.WAREHOUSE_CHECKED, userId,
                    string.IsNullOrWhiteSpace(request.Note) ? null : request.Note.Trim(), cancellationToken);
                res.Message = "انبار کالا را تأیید و رزرو کرد؛ پیش‌فاکتور آماده‌ی پرداخت است.";
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
