using Application.Common.Contracts.Context;
using Application.Common.Settings;
using Application.Features.Stocktaking.Dtos;
using Common.Exceptions;
using Common.Extensions;
using Domain.Enums;
using Microsoft.EntityFrameworkCore;
using System.Linq.Expressions;

namespace Application.Features.Stocktaking.Queries
{
    /// <summary>The one projection of a stocktake (list, detail, and every stocktake command's answer).</summary>
    public static class StocktakeReader
    {
        public static readonly Expression<Func<Domain.Entities.Stocktake, StocktakeDto>> Header = x => new StocktakeDto
        {
            Id = x.Id,
            Number = x.Number,
            Title = x.Title,
            WarehouseId = x.WarehouseId,
            WarehouseName = x.Warehouse.Name,
            ProductCategoryId = x.ProductCategoryId,
            Brand = x.Brand,
            BinLocationPrefix = x.BinLocationPrefix,
            Status = x.Status,
            SnapshotAt = x.SnapshotAt,
            Note = x.Note,
            CreatedAt = x.CreatedAt,
            CreatedByUserId = x.CreatedByUserId,
            SubmittedAt = x.SubmittedAt,
            ApprovedAt = x.ApprovedAt,
            ApprovedByUserId = x.ApprovedByUserId,
            CancelledAt = x.CancelledAt,
            LineCount = x.Lines.Count,
            CountedLineCount = x.Lines.Count(l => l.ManualCount != null || x.Scans.Any(s => s.ProductId == l.ProductId)),
        };

        /// <summary>The same header, run in memory over a session already loaded with its warehouse, lines and scans.</summary>
        private static readonly Func<Domain.Entities.Stocktake, StocktakeDto> HeaderOf = Header.Compile();

        public static async Task<StocktakeDto> ReadAsync(IWMSDbContext context, int id, CancellationToken cancellationToken)
        {
            // One load of the session (split, so lines x scans is not multiplied into one result set).
            var stocktake = await context.Stocktakes.AsNoTracking()
                .Include(x => x.Warehouse)
                .Include(x => x.Lines).ThenInclude(l => l.Product)
                .Include(x => x.Scans)
                .AsSplitQuery()
                .FirstOrDefaultAsync(x => x.Id == id, cancellationToken)
                ?? throw new NotFoundCustomException("انبارگردانی مورد نظر یافت نشد.");

            var dto = HeaderOf(stocktake);
            dto.StatusTitle = dto.Status.GetDescription();
            dto.IsBlind = dto.Status == StocktakeStatusEnum.COUNTING
                && await SystemSettingValues.GetBooleanAsync(context, SystemSettingCatalog.StocktakeBlindCount, cancellationToken);

            var results = await StocktakeVariance.ComputeAsync(context, stocktake, cancellationToken);

            // The average cost only prices a difference: not read while blind, and only for the lines that differ.
            var pricedIds = dto.IsBlind ? new List<int>() : results.Where(r => r.Difference is not null and not 0).Select(r => r.Line.ProductId).ToList();
            var averages = pricedIds.Count == 0 ? new Dictionary<int, decimal>() : await context.Products.AsNoTracking()
                .Where(p => pricedIds.Contains(p.Id))
                .Select(p => new
                {
                    p.Id,
                    Average = context.InventoryCostLedgerEntries.Where(e => e.ProductId == p.Id).OrderByDescending(e => e.Id).Select(e => (decimal?)e.RunningAverageCost).FirstOrDefault() ?? 0m,
                })
                .ToDictionaryAsync(x => x.Id, x => x.Average, cancellationToken);

            var scannedBarcodes = stocktake.Scans.Where(s => s.ProductUnitId.HasValue && s.ProductId.HasValue)
                .GroupBy(s => s.ProductId!.Value)
                .ToDictionary(g => g.Key, g => g.DistinctBy(s => s.ProductUnitId).OrderBy(s => s.ScannedAt).Select(s => s.Barcode).ToList());

            dto.Lines = results.OrderBy(r => r.Line.Product.Name).Select(r =>
            {
                var blind = dto.IsBlind;
                var difference = blind ? null : r.Difference;
                return new StocktakeLineDto
                {
                    Id = r.Line.Id,
                    ProductId = r.Line.ProductId,
                    ProductCode = r.Line.Product.Code,
                    ProductName = r.Line.Product.Name,
                    SystemQuantity = blind ? null : r.Line.SystemQuantity,
                    ScannedCount = scannedBarcodes.TryGetValue(r.Line.ProductId, out var scanned) ? scanned.Count : 0,
                    ScannedBarcodes = scanned ?? new(),
                    ManualCount = r.Line.ManualCount,
                    CountMode = r.Mode,
                    CountedQuantity = r.Counted,
                    Difference = difference,
                    MissingCount = blind || r.Mode != StocktakeCountModeEnum.SCAN ? null : r.MissingUnitIds.Count,
                    RelocatedCount = blind || r.Mode != StocktakeCountModeEnum.SCAN ? null : r.RelocatedUnitIds.Count,
                    UnexpectedCount = r.Mode != StocktakeCountModeEnum.SCAN ? null : r.UnexpectedUnitIds.Count,
                    MissingBarcodes = blind ? new() : r.MissingUnitIds.Select(u => r.UnitBarcodes[u]).ToList(),
                    UnexpectedBarcodes = r.UnexpectedUnitIds.Select(u => r.UnitBarcodes[u]).ToList(),
                    DifferenceValue = difference.HasValue ? difference.Value * averages.GetValueOrDefault(r.Line.ProductId) : null,
                    AppliedMissing = r.Line.AppliedMissing,
                    AppliedFound = r.Line.AppliedFound,
                };
            }).ToList();

            dto.UnknownBarcodes = stocktake.Scans.Where(s => s.ProductUnitId == null).Select(s => s.Barcode).Distinct().ToList();
            if (!dto.IsBlind)
            {
                dto.TotalMissing = dto.Lines.Sum(l => l.Difference < 0 ? -l.Difference!.Value : 0);
                dto.TotalSurplus = dto.Lines.Sum(l => l.Difference > 0 ? l.Difference!.Value : 0);
                dto.TotalDifferenceValue = dto.Lines.Sum(l => l.DifferenceValue ?? 0);
            }
            return dto;
        }
    }
}
