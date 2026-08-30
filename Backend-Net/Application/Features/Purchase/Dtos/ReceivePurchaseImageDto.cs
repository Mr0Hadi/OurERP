namespace Application.Features.Purchase.Dtos
{
    public class ReceivePurchaseImageDto
    {
        /// <summary>The ObjectKey returned by api/File/UploadImage (a full URL is also accepted and normalized).</summary>
        public string ObjectKey { get; set; } = string.Empty;
        public string? FileName { get; set; }
        public string? Note { get; set; }
    }
}
