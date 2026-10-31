namespace Domain.Enums
{
    // SHIPPED=5/DAMAGED=6/LOST=7/RETURNED_BY_CUSTOMER=8 were added 2026-08-28 at the frontend's
    // request for a "manual status entry" warehouse feature that was never designed, and were
    // never produced anywhere (ProductUnitService - the only thing that mints/consumes/
    // restores/reconciles units - never wrote them; no seed script sets them either). The
    // frontend backed the request out the same week and is back to these same 4 members (see
    // docs/frontend-enum-contract.fa.md section 2). Removed 2026-09-01 for full frontend parity;
    // if a future feature needs them, docs/frontend-enum-contract.fa.md section 2 has the
    // previously-agreed numbers to reuse. QUARANTINED takes 9, not 5, so those documented numbers stay free.
    public enum ProductUnitStatusEnum
    {
        IN_STOCK = 1,
        SOLD = 2,
        RETURNED_TO_SUPPLIER = 3,
        SCRAPPED = 4,

        /// <summary>
        /// Physically in our warehouse but not sellable, awaiting a decision: defective goods on the order line,
        /// excess over the line, or a product the purchase never listed (see ProductUnit.CustodyReason). Not part
        /// of Product.Stock - the invariant Stock == COUNT(IN_STOCK) is unchanged.
        /// </summary>
        QUARANTINED = 9,

        /// <summary>
        /// Scanned by the warehouse for a proforma (CheckSaleWarehouse) and held for that sale line (ProductUnit.SaleItemId):
        /// still on our shelf and still ours in value, but not free to sell, so not part of Product.Stock. Shipping the sale
        /// moves exactly these units to SOLD; editing the line, cancelling or deleting the sale puts them back IN_STOCK.
        /// </summary>
        RESERVED = 10,

        /// <summary>
        /// On a stock transfer between warehouses (GAP-08): off the source shelf, not yet on the destination's. Out of
        /// Product.Stock, still ours (counted in inventory value like RESERVED).
        /// </summary>

        IN_TRANSIT = 11,
    }
}
