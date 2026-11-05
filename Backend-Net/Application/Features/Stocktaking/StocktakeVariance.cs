using Application.Common.Contracts.Context;
using Domain.Entities;
using Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Stocktaking
{
    public enum StocktakeCountModeEnum
    {
        /// <summary>Neither scanned nor typed: skipped at approval.</summary>
        NONE = 0,

        /// <summary>At least one unit of the product was scanned: the count is the scanned units.</summary>
        SCAN = 1,

        /// <summary>A typed quantity (stock without unit labels).</summary>
        MANUAL = 2,
    }

    /// <summary>
    /// The one definition of a stocktake's differences (GAP-01), used by the detail screen and by approval, so what the approver
    /// sees is exactly what is applied. Per product line:
    ///   SCAN   - missing   = units on the shelf at the snapshot, not scanned, and still IN_STOCK in this warehouse now (a unit
    ///                        sold or moved since the snapshot is not "missing" - its own movement already says where it went);
    ///            relocated = scanned units the system has IN_STOCK in another warehouse (moved here, no stock change);
    ///            unexpected= scanned units that are not IN_STOCK at all (sold, scrapped, reserved, ...): reported, never changed.
    ///   MANUAL - difference = typed count - quantity at the snapshot (the count is taken as of the snapshot, so movements since
    ///            are already in the books); a shortage takes the newest units off this warehouse's shelf, a surplus mints new ones.
    /// Nothing here writes.
    /// </summary>
    public static class StocktakeVariance
    {
        public sealed class LineResult
        {
            public StocktakeLine Line { get; init; } = null!;
            public StocktakeCountModeEnum Mode { get; init; }
            public int? Counted { get; init; }
            public int? Difference { get; init; }
            public List<int> MissingUnitIds { get; init; } = new();
            public List<int> RelocatedUnitIds { get; init; } = new();
            public List<int> UnexpectedUnitIds { get; init; } = new();

            /// <summary>Manual mode only: units to take off (negative) or mint (positive).</summary>
            public int ManualAdjustment { get; init; }

            /// <summary>Barcode of every unit in the three id lists (shared by all lines of one computation).</summary>
            public IReadOnlyDictionary<int, string> UnitBarcodes { get; init; } = new Dictionary<int, string>();
        }

        private sealed record UnitState(int Id, int ProductId, ProductUnitStatusEnum Status, int WarehouseId, string Barcode);

        public static async Task<List<LineResult>> ComputeAsync(IWMSDbContext context, Stocktake stocktake, CancellationToken cancellationToken)
        {
            // The snapshot can hold thousands of units: join it to the units in SQL instead of sending its ids back as a parameter.
            var snapshot = await (
                from s in context.StocktakeSnapshotUnits.AsNoTracking()
                where s.StocktakeId == stocktake.Id
                join u in context.ProductUnits.AsNoTracking() on s.ProductUnitId equals u.Id
                select new { s.ProductId, Unit = new UnitState(u.Id, u.ProductId, u.Status, u.WarehouseId, u.Barcode) })
                .ToListAsync(cancellationToken);
            var current = snapshot.Select(x => x.Unit).DistinctBy(u => u.Id).ToDictionary(u => u.Id);

            var scannedUnitIds = stocktake.Scans.Where(s => s.ProductUnitId.HasValue).Select(s => s.ProductUnitId!.Value).Distinct().ToList();
            var scannedOutside = scannedUnitIds.Where(id => !current.ContainsKey(id)).ToList();
            if (scannedOutside.Count > 0)
            {
                var extra = await context.ProductUnits.AsNoTracking()
                    .Where(x => scannedOutside.Contains(x.Id))
                    .Select(x => new UnitState(x.Id, x.ProductId, x.Status, x.WarehouseId, x.Barcode))
                    .ToListAsync(cancellationToken);
                foreach (var unit in extra)
                    current[unit.Id] = unit;
            }
            var barcodes = current.ToDictionary(x => x.Key, x => x.Value.Barcode);

            var scannedByProduct = scannedUnitIds.Where(current.ContainsKey).GroupBy(id => current[id].ProductId).ToDictionary(g => g.Key, g => g.ToList());

            var results = new List<LineResult>();
            foreach (var line in stocktake.Lines)
            {
                if (scannedByProduct.TryGetValue(line.ProductId, out var scanned))
                {
                    var scannedSet = scanned.ToHashSet();
                    results.Add(new LineResult
                    {
                        Line = line,
                        Mode = StocktakeCountModeEnum.SCAN,
                        Counted = scanned.Count,
                        Difference = scanned.Count - line.SystemQuantity,
                        MissingUnitIds = snapshot
                            .Where(s => s.ProductId == line.ProductId && !scannedSet.Contains(s.Unit.Id))
                            .Where(s => s.Unit.Status == ProductUnitStatusEnum.IN_STOCK && s.Unit.WarehouseId == stocktake.WarehouseId)
                            .Select(s => s.Unit.Id).ToList(),
                        RelocatedUnitIds = scanned.Where(id => current[id].Status == ProductUnitStatusEnum.IN_STOCK && current[id].WarehouseId != stocktake.WarehouseId).ToList(),
                        UnexpectedUnitIds = scanned.Where(id => current[id].Status != ProductUnitStatusEnum.IN_STOCK).ToList(),
                        UnitBarcodes = barcodes,
                    });
                }
                else if (line.ManualCount.HasValue)
                {
                    var difference = line.ManualCount.Value - line.SystemQuantity;
                    results.Add(new LineResult
                    {
                        Line = line,
                        Mode = StocktakeCountModeEnum.MANUAL,
                        Counted = line.ManualCount,
                        Difference = difference,
                        ManualAdjustment = difference,
                        UnitBarcodes = barcodes,
                    });
                }
                else
                {
                    results.Add(new LineResult { Line = line, Mode = StocktakeCountModeEnum.NONE, UnitBarcodes = barcodes });
                }
            }
            return results;
        }
    }
}
