namespace Application.Common.Contracts.Storage
{
    /// <summary>
    /// Binds the "ObjectStorage" section of appsettings.json. The endpoint/key/secret/bucket
    /// four-tuple is exactly what Liara's S3-compatible object storage needs - see
    /// https://github.com/liara-cloud/dotnet-getting-started/tree/object-storage
    /// (their sample calls these LIARA_ENDPOINT_URL / LIARA_ACCESS_KEY / LIARA_SECRET_KEY /
    /// BUCKET_NAME; the names here are section-scoped instead so they read normally in DI).
    /// </summary>
    public class ObjectStorageOptions
    {
        public const string SectionName = "ObjectStorage";

        /// <summary>e.g. https://storage.iran.liara.space</summary>
        public string Endpoint { get; set; } = string.Empty;
        public string AccessKey { get; set; } = string.Empty;
        public string SecretKey { get; set; } = string.Empty;
        public string BucketName { get; set; } = string.Empty;

        /// <summary>
        /// The bucket is private, so every URL handed to the browser is a short-lived signed one.
        /// Keep this comfortably longer than a page view but far shorter than a cache lifetime.
        /// </summary>
        public int PresignedUrlExpiryMinutes { get; set; } = 60;

        /// <summary>Rejected above this size, before a single byte reaches the bucket. Default 5MB.</summary>
        public long MaxImageSizeBytes { get; set; } = 5 * 1024 * 1024;

        public List<string> AllowedImageExtensions { get; set; } = new()
        {
            ".jpg", ".jpeg", ".png", ".webp", ".gif"
        };

        public List<string> AllowedImageContentTypes { get; set; } = new()
        {
            "image/jpeg", "image/png", "image/webp", "image/gif"
        };
    }
}
