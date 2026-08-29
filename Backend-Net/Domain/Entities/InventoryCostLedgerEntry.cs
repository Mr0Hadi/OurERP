using Domain.Enums;

namespace Domain.Entities
{
    /// <summary>
    /// One row in the perpetual weighted-average-cost (AVCO) inventory ledger - append-only,
    /// chronological per product. Outbound rows (QuantityDelta &lt; 0) always consume at
    /// RunningAverageCost as it existed immediately before the row, which is what makes this
    /// time-aware: a later PURCHASE_RECEIVED row can never change the cost already written on an
    /// earlier SALE_SHIPPED row. Profit contribution of a row = RevenueDelta + InventoryValueDelta
    /// (InventoryValueDelta is negative for an outflow, so this nets revenue against COGS in one
    /// formula for every row, without a branch); only SALE_SHIPPED, REPLACEMENT_SHIPPED_TO_CUSTOMER
    /// and SALE_RETURN_REFUND ever set a non-zero RevenueDelta.
    /// </summary>
    public class InventoryCostLedgerEntry
    {
        public int Id { get; set; }
        public int ProductId { get; set; }
        public Product Product { get; set; }
        public InventoryCostEventTypeEnum EventType { get; set; }

        /// <summary>e.g. "PurchaseItem"/"SaleItem" - used to look up the historical cost of the
        /// specific transaction being reversed/replaced (see SALE_RETURN_RESTOCK and
        /// PURCHASE_RETURN_REPLACEMENT_RECEIVED).</summary>
        public string? ReferenceType { get; set; }
        public int? ReferenceId { get; set; }

        public DateTime OccurredAt { get; set; }
        public int QuantityDelta { get; set; }
        public decimal UnitCost { get; set; }
        public decimal InventoryValueDelta { get; set; }
        public int RunningQuantity { get; set; }
        public decimal RunningInventoryValue { get; set; }
        public decimal RunningAverageCost { get; set; }
        public decimal RevenueDelta { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
