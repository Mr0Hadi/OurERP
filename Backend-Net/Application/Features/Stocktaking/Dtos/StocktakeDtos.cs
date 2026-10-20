using Domain.Enums;

namespace Application.Features.Stocktaking.Dtos
{
    public class StocktakeDto
    {
        public int Id { get; set; }
        public string Number { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public int WarehouseId { get; set; }
        public string WarehouseName { get; set; } = string.Empty;
        public int? ProductCategoryId { get; set; }
        public string? Brand { get; set; }
        public string? BinLocationPrefix { get; set; }
        public StocktakeStatusEnum Status { get; set; }
        public string StatusTitle { get; set; } = string.Empty;
        public DateTime SnapshotAt { get; set; }
        public string? Note { get; set; }
        public DateTime CreatedAt { get; set; }
        public int? CreatedByUserId { get; set; }
        public DateTime? SubmittedAt { get; set; }
        public DateTime? ApprovedAt { get; set; }
        public int? ApprovedByUserId { get; set; }
        public DateTime? CancelledAt { get; set; }

        public int LineCount { get; set; }
        public int CountedLineCount { get; set; }

        /// <summary>
        /// True while counting with the Stocktake.BlindCount setting on: systemQuantity, difference and the missing/relocated
        /// numbers are withheld (null) so the counters count what they see, not what the system expects.
        /// </summary>
        public bool IsBlind { get; set; }

        /// <summary>Detail only.</summary>
        public List<StocktakeLineDto> Lines { get; set; } = new();

        /// <summary>Detail only: barcodes scanned that the system does not know.</summary>
        public List<string> UnknownBarcodes { get; set; } = new();

        /// <summary>Detail only: totals of the differences (null while blind).</summary>
        public int? TotalMissing { get; set; }
        public int? TotalSurplus { get; set; }
        public decimal? TotalDifferenceValue { get; set; }
    }

    public class StocktakeLineDto
    {
        public int Id { get; set; }
        public int ProductId { get; set; }
        public string ProductCode { get; set; } = string.Empty;
        public string ProductName { get; set; } = string.Empty;

        public int? SystemQuantity { get; set; }
        public int ScannedCount { get; set; }
        public int? ManualCount { get; set; }
        public Application.Features.Stocktaking.StocktakeCountModeEnum CountMode { get; set; }
        public int? CountedQuantity { get; set; }

        /// <summary>Counted - system at the snapshot. Negative = shortage.</summary>
        public int? Difference { get; set; }

        /// <summary>Scan mode: units approval will mark missing / move here / that are not on any shelf (reported only).</summary>
        public int? MissingCount { get; set; }
        public int? RelocatedCount { get; set; }
        public int? UnexpectedCount { get; set; }
        public List<string> MissingBarcodes { get; set; } = new();
        public List<string> UnexpectedBarcodes { get; set; } = new();

        /// <summary>Difference x the product's current average cost.</summary>
        public decimal? DifferenceValue { get; set; }

        /// <summary>After approval: what was actually taken off / put on the shelf.</summary>
        public int? AppliedMissing { get; set; }
        public int? AppliedFound { get; set; }
    }
}
