using System.Linq.Expressions;
using Application.Common.Contracts.Context;
using Application.Common.Contracts.ProductCode;
using Application.Common.Contracts.ProductUnit;
using Common.Exceptions;
using Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Services
{
    public class ProductUnitService : IProductUnitService
    {
        private readonly IWMSDbContext _context;
        private readonly IProductCodeService _productCodeService;

        public ProductUnitService(IWMSDbContext context, IProductCodeService productCodeService)
        {
            _context = context;
            _productCodeService = productCodeService;
        }

        public async Task<List<Domain.Entities.ProductUnit>> MintAsync(Domain.Entities.Product product, int count, int? purchaseItemId, CancellationToken cancellationToken)
        {
            var units = new List<Domain.Entities.ProductUnit>();
            if (count <= 0)
                return units;

            var nextSerial = await GetNextSerialAsync(product.Id, cancellationToken);

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
                    Status = ProductUnitStatusEnum.IN_STOCK,
                    PurchaseItemId = purchaseItemId,
                    CreatedAt = DateTime.Now,
                    IsActive = true
                };

                units.Add(unit);
                await _context.ProductUnits.AddAsync(unit, cancellationToken);
            }

            return units;
        }

        public async Task<List<Domain.Entities.ProductUnit>> ConsumeAsync(Domain.Entities.Product product, int count, int? saleItemId, List<string>? explicitBarcodes, CancellationToken cancellationToken)
        {
            var units = new List<Domain.Entities.ProductUnit>();
            if (count <= 0)
                return units;

            if (explicitBarcodes != null && explicitBarcodes.Count > 0)
            {
                if (explicitBarcodes.Count != count)
                    throw new ValidationCustomException("تعداد بارکدهای اسکن‌شده با مقدار ارسالی مطابقت ندارد.");

                var payloads = explicitBarcodes.Select(_productCodeService.ToPayload).ToList();

                // Compared after normalization, so the same unit scanned in two different raw formats
                // is still caught. Without this, [A, A] passes the count check, marks one unit SOLD and
                // lets Product.Stock drop by two.
                if (payloads.Distinct().Count() != payloads.Count)
                    throw new ValidationCustomException("یک بارکد بیش از یک‌بار اسکن شده است.");

                foreach (var payload in payloads)
                {
                    // The tracker first: a unit minted earlier in this request has no saved row to find.
                    // A tracked unit's in-memory status is also the one the check below must see; the
                    // saved query returns the tracked instance anyway (identity resolution) when it exists.
                    var unit = _context.ProductUnits.Local.FirstOrDefault(x => x.BarcodePayload == payload)
                        ?? await _context.ProductUnits.FirstOrDefaultAsync(x => x.BarcodePayload == payload, cancellationToken)
                        ?? throw new NotFoundCustomException($"بارکد «{payload}» در سیستم یافت نشد.");

                    if (unit.ProductId != product.Id)
                        throw new ValidationCustomException($"بارکد «{unit.Barcode}» متعلق به این محصول نیست.");

                    if (unit.Status != ProductUnitStatusEnum.IN_STOCK)
                        throw new ValidationCustomException($"بارکد «{unit.Barcode}» در انبار موجود نیست.");

                    units.Add(unit);
                }
            }
            else
            {
                units = await SelectUnitsAsync(
                    x => x.ProductId == product.Id && x.Status == ProductUnitStatusEnum.IN_STOCK,
                    saved => saved.OrderBy(x => x.SerialNumber),
                    tracked => tracked.OrderBy(x => x.SerialNumber),
                    count,
                    cancellationToken);

                if (units.Count < count)
                    throw new ValidationCustomException($"تعداد کافی از دانه‌های موجود «{product.Name}» در انبار برای ثبت این خروج وجود ندارد.");
            }

            foreach (var unit in units)
            {
                unit.Status = ProductUnitStatusEnum.SOLD;
                unit.SaleItemId = saleItemId;
                unit.SoldAt = DateTime.Now;
            }

            return units;
        }

        public async Task RestoreAsync(int saleItemId, int healthyCount, int scrapCount, CancellationToken cancellationToken)
        {
            if (healthyCount <= 0 && scrapCount <= 0)
                return;

            var soldUnits = await SelectUnitsAsync(
                x => x.SaleItemId == saleItemId && x.Status == ProductUnitStatusEnum.SOLD,
                saved => saved.OrderBy(x => x.SoldAt).ThenBy(x => x.SerialNumber),
                tracked => tracked.OrderBy(x => x.SoldAt).ThenBy(x => x.SerialNumber),
                healthyCount + scrapCount,
                cancellationToken);

            // Every unit coming back must be one we actually shipped on this sale line. Restoring
            // fewer than requested while the caller still bumps Product.Stock by the full amount
            // would leave stock with no barcoded units behind it.
            if (soldUnits.Count < healthyCount + scrapCount)
                throw new ValidationCustomException("تعداد دانه‌های فروخته‌شده این قلم فروش برای ثبت این مرجوعی کافی نیست.");

            for (var i = 0; i < soldUnits.Count; i++)
            {
                soldUnits[i].Status = i < healthyCount
                    ? ProductUnitStatusEnum.IN_STOCK
                    : ProductUnitStatusEnum.SCRAPPED;
            }
        }

        public async Task ReturnToSupplierAsync(Domain.Entities.Product product, int count, int? purchaseItemId, CancellationToken cancellationToken)
        {
            if (count <= 0)
                return;

            // Only units that came in on this purchase line can go back to its supplier - never
            // borrow stock from another purchase to make up the number.
            Expression<Func<Domain.Entities.ProductUnit, bool>> filter = purchaseItemId is int lineId
                ? x => x.ProductId == product.Id && x.Status == ProductUnitStatusEnum.IN_STOCK && x.PurchaseItemId == lineId
                : x => x.ProductId == product.Id && x.Status == ProductUnitStatusEnum.IN_STOCK;

            var units = await SelectUnitsAsync(
                filter,
                saved => saved.OrderBy(x => x.SerialNumber),
                tracked => tracked.OrderBy(x => x.SerialNumber),
                count,
                cancellationToken);

            if (units.Count < count)
                throw new ValidationCustomException(purchaseItemId.HasValue
                    ? $"تعداد کافی از دانه‌های موجود «{product.Name}» مربوط به این خرید در انبار برای ثبت این عودت وجود ندارد."
                    : $"تعداد کافی از دانه‌های موجود «{product.Name}» در انبار برای ثبت این عودت وجود ندارد.");

            foreach (var unit in units)
                unit.Status = ProductUnitStatusEnum.RETURNED_TO_SUPPLIER;
        }

        public async Task ReconcileStockAsync(Domain.Entities.Product product, int newStock, CancellationToken cancellationToken)
        {
            Expression<Func<Domain.Entities.ProductUnit, bool>> inStock =
                x => x.ProductId == product.Id && x.Status == ProductUnitStatusEnum.IN_STOCK;

            var inStockCount = await CountUnitsAsync(inStock, cancellationToken);

            var diff = newStock - inStockCount;
            if (diff == 0)
                return;

            if (diff > 0)
            {
                await MintAsync(product, diff, null, cancellationToken);
                return;
            }

            var toScrap = await SelectUnitsAsync(
                inStock,
                saved => saved.OrderByDescending(x => x.SerialNumber),
                tracked => tracked.OrderByDescending(x => x.SerialNumber),
                -diff,
                cancellationToken);

            foreach (var unit in toScrap)
                unit.Status = ProductUnitStatusEnum.SCRAPPED;
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
            CancellationToken cancellationToken)
        {
            var tracked = TrackedUnits();
            var trackedIds = tracked.Where(u => u.Id > 0).Select(u => u.Id).ToList();

            var saved = await orderSaved(_context.ProductUnits.Where(filter).Where(x => !trackedIds.Contains(x.Id)))
                .Take(count)
                .ToListAsync(cancellationToken);

            var matches = filter.Compile();
            return orderTracked(saved.Concat(tracked.Where(matches))).Take(count).ToList();
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
