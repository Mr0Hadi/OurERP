namespace Domain.Enums
{
    /// <summary>
    /// One entry in the perpetual weighted-average-cost (AVCO) inventory ledger
    /// (InventoryCostLedgerEntry). Only SALE_SHIPPED, REPLACEMENT_SHIPPED_TO_CUSTOMER and
    /// SALE_RETURN_REFUND ever carry a non-zero RevenueDelta - everything else is a pure
    /// inventory/valuation movement that still feeds the moving average going forward.
    /// </summary>
    public enum InventoryCostEventTypeEnum
    {
        OPENING_BALANCE,
        MANUAL_ADJUSTMENT_IN,
        MANUAL_ADJUSTMENT_OUT,
        PURCHASE_RECEIVED,
        SALE_SHIPPED,
        SALE_RETURN_RESTOCK,
        SALE_RETURN_REFUND,
        REPLACEMENT_SHIPPED_TO_CUSTOMER,
        PURCHASE_RETURN_REPLACEMENT_RECEIVED,
        PURCHASE_RETURN_SHIPPED_TO_SUPPLIER,
    }
}
