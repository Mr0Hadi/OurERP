namespace Domain.Enums
{
    public enum SalesStatusEnum
    {
        PENDING,
        PROCESSING,
        PARTIALLY_DELIVERED,
        DELIVERED,
        RETURNED,
        CANCELLED,
        // Appended (not inserted) so existing persisted integer values keep their meaning.
        SHIPPED,
    }
}
