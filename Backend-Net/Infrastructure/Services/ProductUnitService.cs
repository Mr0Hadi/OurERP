using System.Linq.Expressions;
using Application.Common.Contracts.Context;
using Application.Common.Contracts.ProductCode;
using Application.Common.Contracts.ProductUnit;
using Application.Common.Contracts.UserContextService;
using Common.Exceptions;
using Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Services
{
    public class ProductUnitService : IProductUnitService
    {
        private readonly IWMSDbContext _context;
        private readonly IProductCodeService _productCodeService;
        private readonly IUserContextService _userContextService;

        public ProductUnitService(IWMSDbContext context, IProductCodeService productCodeService, IUserContextService userContextService)
        {
            _context = context;
            _productCodeService = productCodeService;
            _userContextService = userContextService;
        }

        public async Task<List<Domain.Entities.ProductUnit>> MintAsync(Domain.Entities.Product product, int count, UnitOrigin origin, UnitMovementContext movement, CancellationToken cancellationToken)
        {
            var units = new List<Domain.Entities.ProductUnit>();
            if (count <= 0)
                return units;

            if (origin.Status is not (ProductUnitStatusEnum.IN_STOCK or ProductUnitStatusEnum.QUARANTINED))
                throw new InvalidOperationException($"Units can only be minted IN_STOCK or QUARANTINED, not {origin.Status}.");

            // A quarantined unit without a value would leave the quarantine balance unreconcilable on its way out.
            if (origin.Status == ProductUnitStatusEnum.QUARANTINED && origin.QuarantineCost is null)
                throw new InvalidOperationException("Units minted QUARANTINED must state their QuarantineCost.");

            var nextSerial = await GetNextSerialAsync(product.Id, cancellationToken);
            // Always a warehouse: the one the movement names (multi-warehouse on), otherwise the default one (CLAUDE.md 6b).
            var warehouseId = movement.WarehouseId ?? await DefaultWarehouseIdAsync(cancellationToken);

            for (var i = 0; i < count; i++)
            {
                var serial = nextSerial + i;
                var barcode = _productCodeService.BuildUnitBarcode(product.Code, serial);

                var unit = new Domain.Entities.ProductUnit
                {
                    ProductId = product.Id,
                    SerialNumber = serial,
                    Barcode = barcode,
                    BarcodePayload = _productCodeService.ToPayload(barcode),
                    Status = origin.Status,
                    WarehouseId = warehouseId,
                    PurchaseId = origin.PurchaseId,
                    PurchaseItemId = origin.PurchaseItemId,
                    CustodyReason = origin.CustodyReason,
                    QuarantineCost = origin.Status == ProductUnitStatusEnum.QUARANTINED ? origin.QuarantineCost : null,
                    CreatedAt = DateTime.Now,
                    IsActive = true
                };

                units.Add(unit);
                await _context.ProductUnits.AddAsync(unit, cancellationToken);
                await RecordAsync(unit, null, movement, cancellationToken);
            }

            return units;
        }

        public async Task<List<Domain.Entities.ProductUnit>> ConsumeAsync(Domain.Entities.Product product, int count, int? saleItemId, UnitCustodyReasonEnum? custodyReason, List<string>? explicitBarcodes, UnitMovementContext movement, CancellationToken cancellationToken)
        {
            var units = new List<Domain.Entities.ProductUnit>();
            if (count <= 0)
                return units;

            if (explicitBarcodes is { Count: > 0 })
            {
                units = await ResolveScannedAsync(product.Id, explicitBarcodes, count,
                    unit => unit.Status == ProductUnitStatusEnum.IN_STOCK,
                    unit => $"بارکد «{unit.Barcode}» در انبار موجود نیست.",
                    "تعداد بارکدهای اسکن‌شده با مقدار ارسالی مطابقت ندارد.",
                    cancellationToken);
            }
            else
            {
                units = await SelectUnitsAsync(
                    x => x.ProductId == product.Id && x.Status == ProductUnitStatusEnum.IN_STOCK,
                    saved => saved.OrderBy(x => x.SerialNumber),
                    tracked => tracked.OrderBy(x => x.SerialNumber),
                    count,
                    cancellationToken,
                    movement.WarehouseId);

                if (units.Count < count)
                    throw new ValidationCustomException($"تعداد کافی از دانه‌های موجود «{product.Name}» در انبار برای ثبت این خروج وجود ندارد.");
            }

            foreach (var unit in units)
            {
                var from = unit.Status;
                unit.Status = ProductUnitStatusEnum.SOLD;
                unit.SaleItemId = saleItemId;
                unit.CustodyReason = custodyReason;
                unit.SoldAt = DateTime.Now;
                await RecordAsync(unit, from, movement, cancellationToken);
            }

            return units;
        }

        public async Task<List<Domain.Entities.ProductUnit>> ReserveAsync(Domain.Entities.Product product, int saleItemId, List<string> barcodes, UnitMovementContext movement, CancellationToken cancellationToken)
        {
            if (barcodes.Count == 0)
                return new();

            var units = await ResolveScannedAsync(product.Id, barcodes, barcodes.Count,
                unit => unit.Status == ProductUnitStatusEnum.IN_STOCK,
                unit => unit.Status == ProductUnitStatusEnum.RESERVED
                    ? $"بارکد «{unit.Barcode}» برای پیش‌فاکتور دیگری رزرو شده است."
                    : $"بارکد «{unit.Barcode}» در انبار موجود نیست.",
                "تعداد بارکدهای اسکن‌شده با تعداد این قلم مطابقت ندارد.",
                cancellationToken);

            foreach (var unit in units)
            {
                var from = unit.Status;
                unit.Status = ProductUnitStatusEnum.RESERVED;
                unit.SaleItemId = saleItemId;
                await RecordAsync(unit, from, movement, cancellationToken);
            }

            return units;
        }

        public async Task<List<Domain.Entities.ProductUnit>> ReleaseReservationAsync(int saleItemId, UnitMovementContext movement, CancellationToken cancellationToken)
        {
            var units = await SelectUnitsAsync(
                ReservedFor(saleItemId),
                saved => saved.OrderBy(x => x.SerialNumber),
                tracked => tracked.OrderBy(x => x.SerialNumber),
                int.MaxValue,
                cancellationToken);

            foreach (var unit in units)
            {
                var from = unit.Status;
                unit.Status = ProductUnitStatusEnum.IN_STOCK;
                // Before the movement row, so it still names the line the reservation was for.
                await RecordAsync(unit, from, movement, cancellationToken);
                unit.SaleItemId = null;
            }

            return units;
        }

        public Task<int> CountReservedAsync(int saleItemId, CancellationToken cancellationToken) =>
            CountUnitsAsync(ReservedFor(saleItemId), cancellationToken);

        public async Task<List<Domain.Entities.ProductUnit>> ConsumeReservedAsync(Domain.Entities.Product product, int count, int saleItemId, List<string>? explicitBarcodes, UnitMovementContext movement, CancellationToken cancellationToken)
        {
            if (count <= 0)
                return new();

            var filter = ReservedFor(saleItemId);
            List<Domain.Entities.ProductUnit> units;

            if (explicitBarcodes is { Count: > 0 })
            {
                units = await ResolveScannedAsync(product.Id, explicitBarcodes, count,
                    filter.Compile(),
                    unit => $"بارکد «{unit.Barcode}» از دانه‌های رزروشده‌ی این قلم فروش نیست.",
                    "تعداد بارکدهای اسکن‌شده با مقدار ارسالی مطابقت ندارد.",
                    cancellationToken);
            }
            else
            {
                units = await SelectUnitsAsync(filter,
                    saved => saved.OrderBy(x => x.SerialNumber),
                    tracked => tracked.OrderBy(x => x.SerialNumber),
                    count,
                    cancellationToken);

                if (units.Count < count)
                    throw new ValidationCustomException($"تعداد دانه‌های رزروشده‌ی «{product.Name}» برای این ارسال کافی نیست.");
            }

            foreach (var unit in units)
            {
                var from = unit.Status;
                unit.Status = ProductUnitStatusEnum.SOLD;
                unit.CustodyReason = UnitCustodyReasonEnum.ON_ORDER;
                unit.SoldAt = DateTime.Now;
                await RecordAsync(unit, from, movement, cancellationToken);
            }

            return units;
        }

        private static Expression<Func<Domain.Entities.ProductUnit, bool>> ReservedFor(int saleItemId) =>
            x => x.SaleItemId == saleItemId && x.Status == ProductUnitStatusEnum.RESERVED;

        public async Task RestoreAsync(int saleItemId, bool excessUnits, int healthyCount, int defectiveCount, decimal defectiveUnitCost, List<string>? barcodes, List<string>? defectiveBarcodes, UnitMovementContext movement, CancellationToken cancellationToken)
        {
            if (healthyCount <= 0 && defectiveCount <= 0)
                return;

            var total = healthyCount + defectiveCount;
            List<Domain.Entities.ProductUnit> units;
            HashSet<string> scrapPayloads;

            // Units sold before custody was recorded carry none, and are ordered units.
            Expression<Func<Domain.Entities.ProductUnit, bool>> soldOnLine = excessUnits
                ? x => x.SaleItemId == saleItemId && x.Status == ProductUnitStatusEnum.SOLD && x.CustodyReason == UnitCustodyReasonEnum.EXCESS
                : x => x.SaleItemId == saleItemId && x.Status == ProductUnitStatusEnum.SOLD && (x.CustodyReason == null || x.CustodyReason != UnitCustodyReasonEnum.EXCESS);

            if (barcodes is { Count: > 0 })
            {
                units = await ResolveScannedAsync(null, barcodes, total,
                    soldOnLine.Compile(),
                    unit => $"بارکد «{unit.Barcode}» از دانه‌های فروخته‌شده‌ی این قلم فروش نیست.",
                    "تعداد بارکدهای اسکن‌شده با مقدار این مرحله مطابقت ندارد.",
                    cancellationToken);

                var scanned = (defectiveBarcodes ?? new()).Select(_productCodeService.ToPayload).ToList();
                scrapPayloads = scanned.ToHashSet();

                if (scanned.Count != defectiveCount || scrapPayloads.Count != scanned.Count)
                    throw new ValidationCustomException("بارکد دانه‌های معیوب باید دقیقاً به تعداد دانه‌های معیوب و بدون تکرار اسکن شود.");

                if (!scrapPayloads.All(p => units.Any(u => u.BarcodePayload == p)))
                    throw new ValidationCustomException("بارکد دانه‌ی معیوب باید یکی از بارکدهای اسکن‌شده‌ی همین مرحله باشد.");
            }
            else
            {
                if (defectiveBarcodes is { Count: > 0 })
                    throw new ValidationCustomException("بارکد دانه‌های معیوب بدون بارکد کل دانه‌های مرحله قابل ثبت نیست.");

                units = await SelectUnitsAsync(
                    soldOnLine,
                    saved => saved.OrderBy(x => x.SoldAt).ThenBy(x => x.SerialNumber),
                    tracked => tracked.OrderBy(x => x.SoldAt).ThenBy(x => x.SerialNumber),
                    total,
                    cancellationToken);

                // Every unit coming back must be one we actually shipped on this sale line. Restoring
                // fewer than requested while the caller still bumps Product.Stock by the full amount
                // would leave stock with no barcoded units behind it.
                if (units.Count < total)
                    throw new ValidationCustomException("تعداد دانه‌های فروخته‌شده این قلم فروش برای ثبت این مرجوعی کافی نیست.");

                scrapPayloads = units.Skip(healthyCount).Select(u => u.BarcodePayload).ToHashSet();
            }

            foreach (var unit in units)
            {
                var from = unit.Status;
                if (scrapPayloads.Contains(unit.BarcodePayload))
                {
                    // Held, not destroyed: whether it goes back to the supplier, back on the shelf or to scrap is decided later.
                    unit.Status = ProductUnitStatusEnum.QUARANTINED;
                    unit.CustodyReason = UnitCustodyReasonEnum.CUSTOMER_RETURN;
                    unit.QuarantineCost = defectiveUnitCost;
                }
                else
                {
                    unit.Status = ProductUnitStatusEnum.IN_STOCK;
                }
                await RecordAsync(unit, from, movement, cancellationToken);
            }
        }

        public Task<List<Domain.Entities.ProductUnit>> ReturnToSupplierAsync(Domain.Entities.Product product, int count, UnitSelection selection, List<string>? explicitBarcodes, UnitMovementContext movement, CancellationToken cancellationToken) =>
            MoveSelectedAsync(product, count, selection, explicitBarcodes, ProductUnitStatusEnum.RETURNED_TO_SUPPLIER, movement, cancellationToken);

        public Task<List<Domain.Entities.ProductUnit>> ReleaseFromQuarantineAsync(Domain.Entities.Product product, int count, UnitSelection selection, List<string>? explicitBarcodes, UnitMovementContext movement, CancellationToken cancellationToken) =>
            MoveSelectedAsync(product, count, RequireQuarantine(selection), explicitBarcodes, ProductUnitStatusEnum.IN_STOCK, movement, cancellationToken);

        public Task<List<Domain.Entities.ProductUnit>> ScrapFromQuarantineAsync(Domain.Entities.Product product, int count, UnitSelection selection, List<string>? explicitBarcodes, UnitMovementContext movement, CancellationToken cancellationToken) =>
            MoveSelectedAsync(product, count, RequireQuarantine(selection), explicitBarcodes, ProductUnitStatusEnum.SCRAPPED, movement, cancellationToken);

        public async Task<(List<Domain.Entities.ProductUnit> Units, decimal PreviousHeldValue)> AcceptExcessAsync(Domain.Entities.Product product, int count, UnitSelection selection, List<string>? explicitBarcodes, int purchaseItemId, decimal netUnitCost, UnitMovementContext movement, CancellationToken cancellationToken)
        {
            var previous = 0m;
            var units = await MoveSelectedAsync(product, count, RequireQuarantine(selection), explicitBarcodes, ProductUnitStatusEnum.QUARANTINED, movement, cancellationToken,
                retag: unit =>
                {
                    previous += unit.QuarantineCost ?? 0m;
                    unit.PurchaseItemId = purchaseItemId;
                    unit.CustodyReason = UnitCustodyReasonEnum.ON_ORDER;
                    unit.QuarantineCost = netUnitCost;
                });
            return (units, previous);
        }

        public async Task ApplyActionAsync(IReadOnlyCollection<Domain.Entities.ProductUnit> units, ProductUnitActionEnum action, decimal? quarantineCost, UnitMovementContext movement, CancellationToken cancellationToken)
        {
            foreach (var unit in units)
            {
                var from = unit.Status;
                switch (action)
                {
                    case ProductUnitActionEnum.QUARANTINE when from == ProductUnitStatusEnum.IN_STOCK:
                        unit.Status = ProductUnitStatusEnum.QUARANTINED;
                        unit.CustodyReason = UnitCustodyReasonEnum.WAREHOUSE_HOLD;
                        unit.QuarantineCost = quarantineCost ?? throw new InvalidOperationException("A unit put into quarantine must state its QuarantineCost.");
                        break;
                    case ProductUnitActionEnum.RELEASE when from == ProductUnitStatusEnum.QUARANTINED:
                        unit.Status = ProductUnitStatusEnum.IN_STOCK;
                        break;
                    case ProductUnitActionEnum.SCRAP when from is ProductUnitStatusEnum.IN_STOCK or ProductUnitStatusEnum.QUARANTINED:
                        unit.Status = ProductUnitStatusEnum.SCRAPPED;
                        break;
                    default:
                        throw new InvalidOperationException($"{action} cannot be applied to a unit in {from}.");
                }
                await RecordAsync(unit, from, movement, cancellationToken);
            }
        }

        public Task<List<Domain.Entities.ProductUnit>> ScrapFromStockAsync(Domain.Entities.Product product, int count, UnitSelection selection, List<string>? explicitBarcodes, UnitMovementContext movement, CancellationToken cancellationToken) =>
            MoveSelectedAsync(product, count,
                selection.Status == ProductUnitStatusEnum.IN_STOCK ? selection : throw new InvalidOperationException($"Scrap from stock takes IN_STOCK units only, not {selection.Status}."),
                explicitBarcodes, ProductUnitStatusEnum.SCRAPPED, movement, cancellationToken);

        private static UnitSelection RequireQuarantine(UnitSelection selection) =>
            selection.Status == ProductUnitStatusEnum.QUARANTINED
                ? selection
                : throw new InvalidOperationException($"Release and scrap take QUARANTINED units only, not {selection.Status}.");

        /// <summary>
        /// Moves <paramref name="count"/> units matching <paramref name="selection"/> to <paramref name="toStatus"/>: the scanned ones,
        /// or FIFO by serial. The selection is never widened to make up a shortfall - only units of that status, and of that
        /// purchase/line/custody reason when given, are eligible.
        /// </summary>
        private async Task<List<Domain.Entities.ProductUnit>> MoveSelectedAsync(Domain.Entities.Product product, int count, UnitSelection selection, List<string>? explicitBarcodes, ProductUnitStatusEnum toStatus, UnitMovementContext movement, CancellationToken cancellationToken, Action<Domain.Entities.ProductUnit>? retag = null)
        {
            if (count <= 0)
                return new();

            var filter = FilterFor(product.Id, selection);
            var inQuarantine = selection.Status == ProductUnitStatusEnum.QUARANTINED;
            var narrowed = selection.PurchaseId.HasValue || selection.PurchaseItemId.HasValue || selection.CustodyReason.HasValue;
            List<Domain.Entities.ProductUnit> units;

            if (explicitBarcodes is { Count: > 0 })
            {
                var matches = filter.Compile();
                units = await ResolveScannedAsync(product.Id, explicitBarcodes, count,
                    matches,
                    unit => inQuarantine
                        ? $"بارکد «{unit.Barcode}» در قرنطینه‌ی مربوط به این ادعا نیست."
                        : narrowed
                            ? $"بارکد «{unit.Barcode}» در انبار موجود نیست یا مربوط به این خرید نیست."
                            : $"بارکد «{unit.Barcode}» در انبار موجود نیست.",
                    "تعداد بارکدهای اسکن‌شده با مقدار این مرحله مطابقت ندارد.",
                    cancellationToken);
            }
            else
            {
                units = await SelectUnitsAsync(
                    filter,
                    saved => saved.OrderBy(x => x.SerialNumber),
                    tracked => tracked.OrderBy(x => x.SerialNumber),
                    count,
                    cancellationToken,
                    movement.WarehouseId);

                if (units.Count < count)
                    throw new ValidationCustomException(inQuarantine
                        ? $"تعداد کافی از دانه‌های قرنطینه‌ی «{product.Name}» مربوط به این ادعا برای ثبت این مرحله وجود ندارد."
                        : narrowed
                            ? $"تعداد کافی از دانه‌های موجود «{product.Name}» مربوط به این خرید در انبار برای ثبت این عودت وجود ندارد."
                            : $"تعداد کافی از دانه‌های موجود «{product.Name}» در انبار برای ثبت این عودت وجود ندارد.");
            }

            foreach (var unit in units)
            {
                var from = unit.Status;
                unit.Status = toStatus;
                // Before the movement row, so its line snapshot is the one the unit now belongs to.
                retag?.Invoke(unit);
                await RecordAsync(unit, from, movement, cancellationToken);
            }

            return units;
        }

        private static Expression<Func<Domain.Entities.ProductUnit, bool>> FilterFor(int productId, UnitSelection selection) =>
            selection.ToFilter(productId);

        public async Task ReconcileStockAsync(Domain.Entities.Product product, int newStock, UnitMovementContext movement, CancellationToken cancellationToken)
        {
            Expression<Func<Domain.Entities.ProductUnit, bool>> inStock =
                x => x.ProductId == product.Id && x.Status == ProductUnitStatusEnum.IN_STOCK;

            var inStockCount = await CountUnitsAsync(inStock, cancellationToken);

            var diff = newStock - inStockCount;
            if (diff == 0)
                return;

            if (diff > 0)
            {
                await MintAsync(product, diff, UnitOrigin.None, movement, cancellationToken);
                return;
            }

            var toScrap = await SelectUnitsAsync(
                inStock,
                saved => saved.OrderByDescending(x => x.SerialNumber),
                tracked => tracked.OrderByDescending(x => x.SerialNumber),
                -diff,
                cancellationToken);

            foreach (var unit in toScrap)
            {
                var from = unit.Status;
                unit.Status = ProductUnitStatusEnum.SCRAPPED;
                await RecordAsync(unit, from, movement, cancellationToken);
            }
        }

        /// <summary>
        /// The units named by scanned barcodes, after the checks every scan path shares: exactly
        /// <paramref name="expectedCount"/> barcodes, no unit twice (compared after normalization, so the same unit
        /// scanned in two raw formats is still caught - [A, A] used to mark one unit and move stock by two), every
        /// barcode known, of <paramref name="productId"/> when given, and <paramref name="isEligible"/>.
        /// </summary>
        private async Task<List<Domain.Entities.ProductUnit>> ResolveScannedAsync(
            int? productId,
            List<string> barcodes,
            int expectedCount,
            Func<Domain.Entities.ProductUnit, bool> isEligible,
            Func<Domain.Entities.ProductUnit, string> ineligibleMessage,
            string countMismatchMessage,
            CancellationToken cancellationToken)
        {
            if (barcodes.Count != expectedCount)
                throw new ValidationCustomException(countMismatchMessage);

            var payloads = barcodes.Select(_productCodeService.ToPayload).ToList();

            if (payloads.Distinct().Count() != payloads.Count)
                throw new ValidationCustomException("یک بارکد بیش از یک‌بار اسکن شده است.");

            var units = new List<Domain.Entities.ProductUnit>();

            foreach (var payload in payloads)
            {
                // The tracker first: a unit minted earlier in this request has no saved row to find.
                // A tracked unit's in-memory status is also the one the checks below must see; the
                // saved query returns the tracked instance anyway (identity resolution) when it exists.
                var unit = _context.ProductUnits.Local.FirstOrDefault(x => x.BarcodePayload == payload)
                    ?? await _context.ProductUnits.FirstOrDefaultAsync(x => x.BarcodePayload == payload, cancellationToken)
                    ?? throw new NotFoundCustomException($"بارکد «{payload}» در سیستم یافت نشد.");

                if (productId.HasValue && unit.ProductId != productId.Value)
                    throw new ValidationCustomException($"بارکد «{unit.Barcode}» متعلق به این محصول نیست.");

                if (!isEligible(unit))
                    throw new ValidationCustomException(ineligibleMessage(unit));

                units.Add(unit);
            }

            return units;
        }

        public async Task<List<Domain.Entities.ProductUnit>> DispatchToTransferAsync(Domain.Entities.Product product, int count, int fromWarehouseId, List<string>? explicitBarcodes, UnitMovementContext movement, CancellationToken cancellationToken)
        {
            List<Domain.Entities.ProductUnit> units;
            if (explicitBarcodes is { Count: > 0 })
            {
                units = await ResolveScannedAsync(product.Id, explicitBarcodes, count,
                    unit => unit.Status == ProductUnitStatusEnum.IN_STOCK && unit.WarehouseId == fromWarehouseId,
                    unit => $"بارکد «{unit.Barcode}» در موجودی انبار مبدأ نیست.",
                    "تعداد بارکدهای اسکن‌شده با مقدار حواله مطابقت ندارد.",
                    cancellationToken);
            }
            else
            {
                units = await SelectUnitsAsync(
                    x => x.ProductId == product.Id && x.Status == ProductUnitStatusEnum.IN_STOCK,
                    saved => saved.OrderBy(x => x.SerialNumber),
                    tracked => tracked.OrderBy(x => x.SerialNumber),
                    count,
                    cancellationToken,
                    fromWarehouseId);
                if (units.Count < count)
                    throw new ValidationCustomException($"موجودی «{product.Name}» در انبار مبدأ برای این حواله کافی نیست.");
            }

            foreach (var unit in units)
            {
                var from = unit.Status;
                unit.Status = ProductUnitStatusEnum.IN_TRANSIT;
                await RecordAsync(unit, from, movement, cancellationToken);
            }
            return units;
        }

        public async Task PlaceInStockAsync(IReadOnlyCollection<Domain.Entities.ProductUnit> units, int warehouseId, UnitMovementContext movement, CancellationToken cancellationToken)
        {
            foreach (var unit in units)
            {
                var from = unit.Status;
                if (from is not (ProductUnitStatusEnum.IN_TRANSIT or ProductUnitStatusEnum.IN_STOCK))
                    throw new InvalidOperationException($"Only IN_TRANSIT or IN_STOCK units are placed on a shelf, not {from}.");
                if (unit.WarehouseId != warehouseId)
                    unit.BinLocation = null;
                unit.Status = ProductUnitStatusEnum.IN_STOCK;
                unit.WarehouseId = warehouseId;
                await RecordAsync(unit, from, movement, cancellationToken);
            }
        }

        public async Task MarkMissingAsync(IReadOnlyCollection<Domain.Entities.ProductUnit> units, UnitMovementContext movement, CancellationToken cancellationToken)
        {
            foreach (var unit in units)
            {
                var from = unit.Status;
                if (from != ProductUnitStatusEnum.IN_STOCK)
                    throw new InvalidOperationException($"Only IN_STOCK units are found missing, not {from}.");
                unit.Status = ProductUnitStatusEnum.SCRAPPED;
                await RecordAsync(unit, from, movement, cancellationToken);
            }
        }

        public async Task<List<Domain.Entities.ProductUnit>> TakeFromStockAsync(Domain.Entities.Product product, int count, int warehouseId, UnitMovementContext movement, CancellationToken cancellationToken)
        {
            var units = await SelectUnitsAsync(
                x => x.ProductId == product.Id && x.Status == ProductUnitStatusEnum.IN_STOCK,
                saved => saved.OrderByDescending(x => x.SerialNumber),
                tracked => tracked.OrderByDescending(x => x.SerialNumber),
                count,
                cancellationToken,
                warehouseId);
            if (units.Count < count)
                throw new ValidationCustomException($"در انبار به تعداد کسری «{product.Name}» دانه‌ی موجود نیست.");
            await MarkMissingAsync(units, movement, cancellationToken);
            return units;
        }

        /// <summary>The default warehouse - the one that holds everything while multi-warehouse is off. Read once per request.</summary>
        public async Task<int> DefaultWarehouseIdAsync(CancellationToken cancellationToken)
        {
            if (_defaultWarehouseId.HasValue)
                return _defaultWarehouseId.Value;
            _defaultWarehouseId = await _context.Warehouses.Where(x => x.IsDefault).Select(x => (int?)x.Id).FirstOrDefaultAsync(cancellationToken)
                ?? throw new InvalidOperationException("No default warehouse exists.");
            return _defaultWarehouseId.Value;
        }

        private int? _defaultWarehouseId;

        private async Task RecordAsync(Domain.Entities.ProductUnit unit, ProductUnitStatusEnum? fromStatus, UnitMovementContext movement, CancellationToken cancellationToken)
        {
            // A shelf only means something while the unit is here.
            if (unit.Status is not (ProductUnitStatusEnum.IN_STOCK or ProductUnitStatusEnum.QUARANTINED))
                unit.BinLocation = null;

            // A unit arriving on a shelf (a return, a release) lands in the warehouse the movement names; with none named it
            // stays where it last was. A departure's WarehouseId was only the source filter - nothing to change.
            if (movement.WarehouseId.HasValue && fromStatus != null && fromStatus != unit.Status
                && unit.Status is ProductUnitStatusEnum.IN_STOCK or ProductUnitStatusEnum.QUARANTINED
                && fromStatus is not (ProductUnitStatusEnum.IN_STOCK or ProductUnitStatusEnum.QUARANTINED))
            {
                if (unit.WarehouseId != movement.WarehouseId.Value)
                    unit.BinLocation = null;
                unit.WarehouseId = movement.WarehouseId.Value;
            }

            // Entering quarantine (not moving within it - AcceptExcess keeps the original entry): stamp when and by which document.
            if (unit.Status == ProductUnitStatusEnum.QUARANTINED && fromStatus != ProductUnitStatusEnum.QUARANTINED)
            {
                unit.QuarantinedAt = movement.OccurredAt;
                unit.QuarantineDocumentKind = movement.DocumentKind;
                unit.QuarantineDocumentId = movement.DocumentId;
            }

            await _context.ProductUnitMovements.AddAsync(new Domain.Entities.ProductUnitMovement
            {
                // The navigation, not the id: a unit minted in this request has no id until SaveChanges.
                ProductUnit = unit,
                ProductId = unit.ProductId,
                WarehouseId = unit.WarehouseId == 0 ? null : unit.WarehouseId,
                FromStatus = fromStatus,
                ToStatus = unit.Status,
                Reason = movement.Reason,
                DocumentKind = movement.DocumentKind,
                DocumentId = movement.DocumentId,
                PurchaseItemId = unit.PurchaseItemId,
                SaleItemId = unit.SaleItemId,
                CustomerId = movement.CustomerId,
                SupplierId = movement.SupplierId,
                UserId = int.TryParse(_userContextService.GetUserId(), out var userId) ? userId : null,
                Note = movement.Note,
                ActionReason = movement.ActionReason,
                OccurredAt = movement.OccurredAt,
                CreatedAt = DateTime.Now,
            }, cancellationToken);
        }

        private async Task<int> GetNextSerialAsync(int productId, CancellationToken cancellationToken)
        {
            var maxSavedSerial = await _context.ProductUnits
                .Where(x => x.ProductId == productId)
                .Select(x => (int?)x.SerialNumber)
                .MaxAsync(cancellationToken);

            // Units minted earlier in this same request are tracked but not saved, so the query above
            // cannot see them: two MintAsync calls for one product before SaveChanges used to hand out
            // the same serials, and the unique (ProductId, SerialNumber) index then failed the whole
            // save. Local holds every tracked unit, Added ones included, with their real serials.
            var maxInFlightSerial = _context.ProductUnits.Local
                .Where(x => x.ProductId == productId)
                .Select(x => (int?)x.SerialNumber)
                .Max();

            return Math.Max(maxSavedSerial ?? 0, maxInFlightSerial ?? 0) + 1;
        }

        /// <summary>
        /// Picks up to <paramref name="count"/> units matching <paramref name="filter"/> as this request
        /// sees them. No method here saves, so a unit changed earlier in the same request still carries its
        /// old status in the database, and a unit minted earlier has no row at all. Selecting from saved rows
        /// alone let two movements of one product in a single request pick the same unit twice - two
        /// ConsumeAsync calls marked one unit SOLD while Product.Stock dropped twice, breaking
        /// Stock == COUNT(ProductUnit WHERE IN_STOCK) - and made units minted moments earlier invisible.
        ///
        /// So: every unit the context tracks is judged by its in-memory values and kept out of the saved
        /// query (by id), and every other unit is judged by its saved row. The two sets cannot overlap, and
        /// the ordering is applied once over both.
        /// </summary>
        private async Task<List<Domain.Entities.ProductUnit>> SelectUnitsAsync(
            Expression<Func<Domain.Entities.ProductUnit, bool>> filter,
            Func<IQueryable<Domain.Entities.ProductUnit>, IOrderedQueryable<Domain.Entities.ProductUnit>> orderSaved,
            Func<IEnumerable<Domain.Entities.ProductUnit>, IOrderedEnumerable<Domain.Entities.ProductUnit>> orderTracked,
            int count,
            CancellationToken cancellationToken,
            int? warehouseId = null)
        {
            var tracked = TrackedUnits();
            var trackedIds = tracked.Where(u => u.Id > 0).Select(u => u.Id).ToList();

            // A departure from a named warehouse (multi-warehouse on) picks only there; otherwise from any warehouse.
            var saved = await orderSaved(_context.ProductUnits.Where(filter).Where(x => !trackedIds.Contains(x.Id))
                    .Where(x => warehouseId == null || x.WarehouseId == warehouseId))
                .Take(count)
                .ToListAsync(cancellationToken);

            var matches = filter.Compile();
            return orderTracked(saved.Concat(tracked.Where(matches).Where(u => warehouseId == null || u.WarehouseId == warehouseId))).Take(count).ToList();
        }

        /// <summary>The count counterpart of <see cref="SelectUnitsAsync"/>, with the same view of the request.</summary>
        private async Task<int> CountUnitsAsync(Expression<Func<Domain.Entities.ProductUnit, bool>> filter, CancellationToken cancellationToken)
        {
            var tracked = TrackedUnits();
            var trackedIds = tracked.Where(u => u.Id > 0).Select(u => u.Id).ToList();

            var savedCount = await _context.ProductUnits
                .Where(filter)
                .Where(x => !trackedIds.Contains(x.Id))
                .CountAsync(cancellationToken);

            return savedCount + tracked.Count(filter.Compile());
        }

        /// <summary>
        /// Every unit the context tracks, whatever its state except Deleted. Added units have no saved row
        /// and no real id yet (EF keeps their temporary key off the entity), which is why callers exclude
        /// saved rows by the ids of tracked units with <c>Id &gt; 0</c> only.
        /// </summary>
        private List<Domain.Entities.ProductUnit> TrackedUnits() =>
            _context.ChangeTracker.Entries<Domain.Entities.ProductUnit>()
                .Where(e => e.State != EntityState.Deleted)
                .Select(e => e.Entity)
                .ToList();
    }
}
