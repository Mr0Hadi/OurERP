namespace Domain.Enums
{
    public enum SaleReturnDecisionStatusEnum
    {
        AWAITING,   // only for REPLACEMENT: the replacement hasn't been shipped (in full) yet
        RESOLVED,   // final
    }
}
