namespace Domain.Enums
{
    /// <summary>Which document a <see cref="Entities.DocumentAttachment"/> or a <see cref="Entities.ProductUnitMovement"/> belongs to.</summary>
    public enum DocumentKindEnum
    {
        PURCHASE = 1,
        SALE = 2,
        // Attachments do not use the two return kinds yet; ProductUnitMovement does.
        PURCHASE_RETURN = 3,
        SALE_RETURN = 4,
    }
}
