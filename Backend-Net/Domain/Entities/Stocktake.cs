using Domain.Enums;

namespace Domain.Entities
{
    /// <summary>
    /// A stocktake session (GAP-01). At creation it snapshots, per product in scope, how many units were on the shelf
    /// (StocktakeLine.SystemQuantity) and which ones (StocktakeSnapshotUnit), so selling and receiving can go on while people
    /// count. A product is counted by scanning its units (StocktakeScan) or, for unlabelled stock, by typing a quantity
    /// (StocktakeLine.ManualCount). Approval applies the differences - see Application/Common/Stocktake/StocktakeVariance.
    /// No IsActive: the lifecycle is Status.
    /// </summary>
    public class Stocktake
    {
        public int Id { get; set; }
        public string Number { get; set; } = null!;
        public string Title { get; set; } = null!;

        /// <summary>The warehouse counted; the default warehouse while multi-warehouse is off.</summary>
        public int WarehouseId { get; set; }
        public Warehouse Warehouse { get; set; } = null!;

        /// <summary>Scope filters used to pick the products (recorded for display; the lines are what counts).</summary>
        public int? ProductCategoryId { get; set; }
        public string? Brand { get; set; }
        public string? BinLocationPrefix { get; set; }

        public StocktakeStatusEnum Status { get; set; }
        public DateTime SnapshotAt { get; set; }
        public string? Note { get; set; }

        public DateTime CreatedAt { get; set; }
        public int? CreatedByUserId { get; set; }
        public DateTime? SubmittedAt { get; set; }
        public int? SubmittedByUserId { get; set; }
        public DateTime? ApprovedAt { get; set; }
        public int? ApprovedByUserId { get; set; }
        public DateTime? CancelledAt { get; set; }

        public List<StocktakeLine> Lines { get; set; } = new();
        public List<StocktakeScan> Scans { get; set; } = new();
        public List<StocktakeSnapshotUnit> SnapshotUnits { get; set; } = new();
    }

    public class StocktakeLine
    {
        public int Id { get; set; }
        public int StocktakeId { get; set; }
        public Stocktake Stocktake { get; set; } = null!;
        public int ProductId { get; set; }
        public Product Product { get; set; } = null!;

        /// <summary>IN_STOCK units of the product in the warehouse at SnapshotAt.</summary>
        public int SystemQuantity { get; set; }

        /// <summary>A typed count, for stock without unit labels. Ignored once any unit of the product is scanned.</summary>
        public int? ManualCount { get; set; }
        public DateTime? ManualCountedAt { get; set; }
        public int? ManualCountedByUserId { get; set; }

        /// <summary>Written at approval: what was taken off (missing) and put on (found) the shelf for this product.</summary>
        public int? AppliedMissing { get; set; }
        public int? AppliedFound { get; set; }
    }

    /// <summary>One unit scanned during the count. A barcode the system does not know is kept too (ProductUnitId null).</summary>
    public class StocktakeScan
    {
        public int Id { get; set; }
        public int StocktakeId { get; set; }
        public Stocktake Stocktake { get; set; } = null!;
        public int? ProductUnitId { get; set; }
        public ProductUnit? ProductUnit { get; set; }
        public int? ProductId { get; set; }
        public string Barcode { get; set; } = null!;
        public DateTime ScannedAt { get; set; }
        public int? ScannedByUserId { get; set; }
    }

    /// <summary>A unit that was on the shelf (IN_STOCK, this warehouse, a product in scope) when the session was created.</summary>
    public class StocktakeSnapshotUnit
    {
        public int Id { get; set; }
        public int StocktakeId { get; set; }
        public Stocktake Stocktake { get; set; } = null!;
        public int ProductUnitId { get; set; }
        public int ProductId { get; set; }
    }
}
