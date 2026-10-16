using Domain.Enums;

namespace Application.Features.Accounting.Dtos
{
    /// <summary>
    /// What one product's stock is worth now, read from the inventory cost ledger as it stands (its latest row per
    /// product) - no costing is computed here. Pool = sellable stock at the running average; OffPool = paid-for goods
    /// held in quarantine, outside the average.
    /// </summary>
    public class InventoryValuationRowDto
    {
        public int ProductId { get; set; }
        public string Code { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public int ProductCategoryId { get; set; }
        public string ProductCategoryName { get; set; } = string.Empty;
        public ProductUnitEnum Unit { get; set; }
        public bool IsActive { get; set; }

        /// <summary>Product.Stock: sellable units on hand.</summary>
        public int Stock { get; set; }

        /// <summary>Units reserved for proformas: on the shelf and still ours (valued in the pool), but out of Stock.</summary>
        public int ReservedQuantity { get; set; }

        /// <summary>Quantity the cost ledger holds in the pool (equals Stock + ReservedQuantity while the two stay in step).</summary>
        public int LedgerQuantity { get; set; }
        public decimal AverageCost { get; set; }
        public decimal PoolValue { get; set; }
        public int QuarantinedQuantity { get; set; }
        public decimal OffPoolValue { get; set; }

        /// <summary>PoolValue + OffPoolValue.</summary>
        public decimal TotalValue { get; set; }
    }

    public class InventoryValuationSummaryDto
    {
        public int ProductCount { get; set; }
        public int Stock { get; set; }
        public int ReservedQuantity { get; set; }
        public int QuarantinedQuantity { get; set; }
        public decimal PoolValue { get; set; }
        public decimal OffPoolValue { get; set; }
        public decimal TotalValue { get; set; }
    }
}
