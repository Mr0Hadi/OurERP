namespace Domain.Enums
{
    // What the warehouse actually observes during physical inspection of a returned claim.
    // Independent from SalesReturnReasonEnum (what the customer originally claimed) - a
    // SaleReturnItem with a null issue type means the inspected quantity was healthy.
    public enum SalesReturnIssueTypeEnum
    {
        DEFECTIVE,
        WRONG_ITEM,
        DAMAGED_IN_TRANSIT,
        QUALITY_ISSUE,
        OTHER,
    }
}
