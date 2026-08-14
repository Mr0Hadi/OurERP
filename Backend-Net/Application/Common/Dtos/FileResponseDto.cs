namespace Application.Common.Dtos
{
    /// <summary>
    /// The one deliberate exception to "every MediatR request returns ResponseDto": binary
    /// documents. Base64 inside ResponseDto would inflate the payload ~33% and break native
    /// browser preview/download, so PDF endpoints return this and the controller streams it.
    /// Errors still travel the normal route - ExceptionHandlingMiddleware turns them into the
    /// usual JSON envelope, which the frontend can tell apart by Content-Type.
    /// </summary>
    public class FileResponseDto
    {
        public byte[] Content { get; set; } = Array.Empty<byte>();
        public string FileName { get; set; } = string.Empty;
        public string ContentType { get; set; } = "application/pdf";
    }
}
