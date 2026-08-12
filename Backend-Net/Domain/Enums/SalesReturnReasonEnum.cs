namespace Domain.Enums
{
    // Why the customer says they're returning it - captured at claim time, before anything is
    // physically inspected. Independent from SalesReturnIssueTypeEnum (what the warehouse
    // actually finds later) - see docs/return-scenarios-guide.fa.md section 2.2.
    public enum SalesReturnReasonEnum
    {
        DEFECTIVE,
        WRONG_ITEM,
        DAMAGED_IN_TRANSIT,
        CHANGED_MIND,
        QUALITY_ISSUE,
        EXCESS_ORDER,
        OTHER,
    }
}
