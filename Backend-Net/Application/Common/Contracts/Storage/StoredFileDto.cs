namespace Application.Common.Contracts.Storage
{
    /// <summary>
    /// One object pulled back out of the bucket, ready to be streamed to the caller by
    /// <c>GET api/File/GetImage</c>. Buffered as a byte[] rather than left as a live
    /// <see cref="Stream"/> on purpose: uploads are capped at
    /// <see cref="ObjectStorageOptions.MaxImageSizeBytes"/> (5MB by default), and a byte[] is what
    /// <see cref="Application.Common.Dtos.FileResponseDto"/> - and therefore every other
    /// file-returning endpoint in this project - already carries.
    /// </summary>
    public class StoredFileDto
    {
        public byte[] Content { get; set; } = Array.Empty<byte>();
        public string ContentType { get; set; } = "application/octet-stream";
        public string FileName { get; set; } = string.Empty;
    }
}
