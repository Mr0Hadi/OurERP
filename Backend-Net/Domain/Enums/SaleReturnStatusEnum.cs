namespace Domain.Enums
{
    public enum SaleReturnStatusEnum
    {
        PENDING_INSPECTION,   // created at claim time; stays here until every claimed unit has been physically inspected
        COORDINATING,         // fully inspected, but not every inspected unit has a final decision yet
        RESOLVED,             // every inspected unit has a final decision
        REJECTED,             // rejected before any physical inspection happened
        CANCELLED,            // cancelled before any physical inspection happened
    }
}
