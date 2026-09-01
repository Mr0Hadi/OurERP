namespace Application.Common.Dtos
{
    /// <summary>
    /// Read shape of a <see cref="Domain.Entities.DocumentAttachment"/>: <see cref="ObjectKey"/>
    /// is the stable stored value, <see cref="Url"/> is a short-lived signed URL that must not be
    /// persisted anywhere (same split as PurchaseReceivingImageDto and the product/customer/
    /// supplier image fields).
    /// </summary>
    public class DocumentAttachmentDto
    {
        public int Id { get; set; }
        public string ObjectKey { get; set; } = string.Empty;
        public string? Url { get; set; }
        public string? FileName { get; set; }
        public string? Note { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
