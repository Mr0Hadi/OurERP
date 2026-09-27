namespace Domain.Enums
{
    /// <summary>
    /// Why we hold a unit. Persisted as an int with explicit values; never renumbered. Read by exactly two rules:
    /// <list type="number">
    /// <item>the claim quota for OFF_ORDER purchase claims (an EXCESS claim may cover only quarantined EXCESS units, an UNLISTED
    /// claim only quarantined UNLISTED units);</item>
    /// <item>which quarantined units a purchase-return claim works on (PurchaseReturnQuarantine.For) - an ON_ORDER claim takes its
    /// line's ON_ORDER, CUSTOMER_RETURN and WAREHOUSE_HOLD units - all goods of that line we paid for and hold as defective.</item>
    /// </list>
    /// Nothing else - not cost, not stock, not which effect is allowed - may branch on it. The cost a unit carries in quarantine is
    /// ProductUnit.QuarantineCost, fixed when it entered.
    /// </summary>
    public enum UnitCustodyReasonEnum
    {
        /// <summary>Counted on the purchase line: paid for at the line price.</summary>
        ON_ORDER = 1,

        /// <summary>More of a line's product than the line still owed: not on the line, not paid for.</summary>
        EXCESS = 2,

        /// <summary>A product the purchase does not list at all: not paid for.</summary>
        UNLISTED = 3,

        /// <summary>
        /// A customer brought it back and the warehouse found it defective (a sale-return GOODS_IN observation). Held rather than
        /// scrapped on arrival: it may go back to the supplier it came from (its PurchaseItemId is kept), be released after a closer
        /// look, or be scrapped - each a decision somebody takes, not a side effect of receiving it.
        /// </summary>
        CUSTOMER_RETURN = 4,

        /// <summary>
        /// The warehouse took it off the shelf itself (ApplyProductUnitAction QUARANTINE) - suspected defect, needs inspection. Its
        /// purchase line is kept: if the fault turns out to be the supplier's, an ON_ORDER purchase-return claim on that line takes it.
        /// </summary>
        WAREHOUSE_HOLD = 5,
    }
}
