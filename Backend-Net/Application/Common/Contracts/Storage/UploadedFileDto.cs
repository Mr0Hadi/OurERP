namespace Application.Common.Contracts.Storage
{
    public class UploadedFileDto
    {
        /// <summary>The value to persist and to send back on the next create/update.</summary>
        public string ObjectKey { get; set; } = string.Empty;

        /// <summary>A short-lived signed URL for previewing the freshly uploaded image.</summary>
        public string? Url { get; set; }

        public string FileName { get; set; } = string.Empty;

        public string? ContentType { get; set; }

        public long Size { get; set; }
    }
}
