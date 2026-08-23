namespace Application.Features.PurchaseReturn.Dtos
{
    /// <summary>
    /// A receiving-session photo. Mirrors the entity/DTO split used for product, customer and
    /// supplier images: <see cref="ObjectKey"/> is the stable stored value, <see cref="Url"/> is a
    /// short-lived signed URL that must not be persisted anywhere.
    /// </summary>
    public class PurchaseReceivingImageDto
    {
        public int Id { get; set; }
        public int PurchaseId { get; set; }
        public int? PurchaseReturnId { get; set; }
        public string ObjectKey { get; set; } = string.Empty;
        public string? Url { get; set; }
        public string? FileName { get; set; }
        public string? Note { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
