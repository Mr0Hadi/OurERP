namespace Domain.Enums
{
    /// <summary>
    /// Unified 14-member problem space replacing PurchaseIssueTypeEnum, SalesReturnReasonEnum and
    /// SalesReturnIssueTypeEnum (matches frontend RETURN_PROBLEMS exactly - same numeric values).
    /// Per-side allowed subsets (which members a purchase claim, a sale claim, or a warehouse
    /// inspection observation may use) are enforced in validators, not by splitting the enum -
    /// mirrors PURCHASE_CLAIM_PROBLEMS / SALES_CLAIM_PROBLEMS / OBSERVED_PROBLEMS on the frontend.
    /// </summary>
    public enum ReturnProblemEnum
    {
        WRONG_ITEM_SHIPPED,
        WRONG_ITEM_INVOICED,
        WRONG_ITEM_ORDERED,
        SHORT_SHIPPED,
        OVER_SHIPPED,
        WRONG_QTY_INVOICED,
        WRONG_QTY_ORDERED,
        DEFECTIVE,
        DAMAGED_IN_TRANSIT,
        QUALITY_ISSUE,
        EXPIRED,
        CHANGED_MIND,
        UNLISTED_ITEM,
        OTHER,
    }
}
