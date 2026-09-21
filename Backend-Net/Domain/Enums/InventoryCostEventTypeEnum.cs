namespace Domain.Enums
{
    /// <summary>
    /// One entry in the perpetual weighted-average-cost (AVCO) inventory ledger
    /// (InventoryCostLedgerEntry). Only SALE_SHIPPED and the return money events (SALE_RETURN_REFUND,
    /// SALE_RETURN_MONEY_IN, PURCHASE_RETURN_MONEY_IN, PURCHASE_RETURN_MONEY_OUT) ever carry a non-zero
    /// RevenueDelta - everything else is a pure inventory/valuation movement that still feeds the moving
    /// average going forward.
    /// </summary>
    public enum InventoryCostEventTypeEnum
    {
        OPENING_BALANCE = 0,
        MANUAL_ADJUSTMENT_IN = 1,
        MANUAL_ADJUSTMENT_OUT = 2,
        PURCHASE_RECEIVED = 3,
        SALE_SHIPPED = 4,

        /// <summary>A sale-return GOODS_IN, at the effect's UnitCost, else the running average, else Product.PurchasePrice.</summary>
        SALE_RETURN_RESTOCK = 5,

        /// <summary>A sale-return MONEY_OUT: negative revenue.</summary>
        SALE_RETURN_REFUND = 6,

        /// <summary>A sale-return GOODS_OUT, at the running average.</summary>
        REPLACEMENT_SHIPPED_TO_CUSTOMER = 7,

        /// <summary>A purchase-return GOODS_IN, at the effect's UnitCost, else the running average, else Product.PurchasePrice.</summary>
        PURCHASE_RETURN_REPLACEMENT_RECEIVED = 8,

        /// <summary>A purchase-return GOODS_OUT, at the running average.</summary>
        PURCHASE_RETURN_SHIPPED_TO_SUPPLIER = 9,

        // EventType is a persisted int column: members are appended, never renumbered. 10 and 11 are
        // retired (they were written by rules that no longer exist) and are not reused, so a row that
        // still carries one keeps an unambiguous meaning.

        /// <summary>A sale-return MONEY_IN: revenue.</summary>
        SALE_RETURN_MONEY_IN = 12,

        /// <summary>A purchase-return MONEY_IN (supplier pays us): RevenueDelta +amount, read by the purchase report as reduced purchase spend.</summary>
        PURCHASE_RETURN_MONEY_IN = 13,

        /// <summary>A purchase-return MONEY_OUT (we pay the supplier): RevenueDelta -amount, read by the purchase report as added purchase spend.</summary>
        PURCHASE_RETURN_MONEY_OUT = 14,

        /// <summary>Receiving: defective units counted on the order line go to quarantine. Paid for, so their value is recorded in
        /// OffPoolValueDelta at the line's net price; QuantityDelta and the running pool are untouched.</summary>
        PURCHASE_RECEIVED_QUARANTINED = 15,

        /// <summary>A GOODS_RELEASE: quarantined units enter the sellable pool at the effect's UnitCost (fallbacks as for GOODS_IN),
        /// and the same value leaves OffPoolValueDelta.</summary>
        QUARANTINE_RELEASED = 16,

        /// <summary>A GOODS_SCRAP: OffPoolValueDelta -quantity x UnitCost. That amount is the reported scrap loss (sale report).</summary>
        QUARANTINE_SCRAPPED = 17,

        /// <summary>A purchase-return GOODS_OUT taken from quarantine: the pool is untouched, OffPoolValueDelta -quantity x UnitCost.</summary>
        PURCHASE_RETURN_SHIPPED_FROM_QUARANTINE = 18,

        /// <summary>A purchase-return GOODS_IN's damaged part, held in quarantine: OffPoolValueDelta +quantity x UnitCost.</summary>
        PURCHASE_RETURN_REPLACEMENT_QUARANTINED = 19,

        /// <summary>ShipSaleCommand ExcessQuantity: units sent to the customer beyond the order leave the pool at the running average,
        /// with no revenue. Counted by the sale report as cost, like a replacement shipped to a customer.</summary>
        SALE_SHIPPED_EXCESS = 20,

        /// <summary>A purchase-return GOODS_SCRAP taken from sellable stock (a defect found after receiving): leaves the pool at the
        /// running average, like any outbound row, with no revenue. The sale report shows it as scrap loss, not cost of goods sold.</summary>
        STOCK_SCRAPPED = 21,
    }
}
