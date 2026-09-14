namespace Domain.Enums
{
    /// <summary>
    /// Why we hold a unit that came in on a purchase. Persisted as an int with explicit values.
    /// Read by exactly one rule: the claim quota for OFF_ORDER purchase claims (an EXCESS claim may cover only
    /// quarantined EXCESS units, an UNLISTED claim only quarantined UNLISTED units). Nothing else - not cost, not
    /// stock, not which effect is allowed - may branch on it.
    /// </summary>
    public enum UnitCustodyReasonEnum
    {
        /// <summary>Counted on the purchase line: paid for at the line price.</summary>
        ON_ORDER = 1,

        /// <summary>More of a line's product than the line still owed: not on the line, not paid for.</summary>
        EXCESS = 2,

        /// <summary>A product the purchase does not list at all: not paid for.</summary>
        UNLISTED = 3,
    }
}
