namespace Domain.Enums
{
    /// <summary>Which document a <see cref="Entities.DocumentAttachment"/> belongs to.</summary>
    public enum DocumentKindEnum
    {
        PURCHASE = 1,
        SALE = 2,
        // Reserved for later - not yet wired into any command/query.
        PURCHASE_RETURN = 3,
        SALE_RETURN = 4,
    }
}
