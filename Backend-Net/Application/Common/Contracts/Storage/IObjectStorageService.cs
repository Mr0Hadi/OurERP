using Application.Common.Enums;

namespace Application.Common.Contracts.Storage
{
    /// <summary>
    /// The one seam onto the cloud bucket. Nothing outside <c>Infrastructure/Services</c> knows
    /// the storage is S3-shaped.
    ///
    /// The bucket is PRIVATE, so what gets persisted in the database is the object KEY
    /// (e.g. <c>products/2026/08/3f1c....jpg</c>), never a URL - a signed URL expires and would
    /// rot in a column. Read-side DTOs carry both: <c>ImageKey</c> (the stable value to send back
    /// on the next update) and <c>ImageUrl</c> (a freshly signed, short-lived URL for &lt;img src&gt;).
    /// </summary>
    public interface IObjectStorageService
    {
        /// <summary>
        /// Streams <paramref name="content"/> into the bucket under <paramref name="folder"/> and
        /// returns the stored object key. The key is generated server-side (date prefix + Guid +
        /// the original extension), so a caller can neither overwrite someone else's object nor
        /// smuggle a path through the file name.
        /// </summary>
        Task<UploadedFileDto> UploadAsync(Stream content, string fileName, string? contentType, ImageFolderEnum folder, CancellationToken cancellationToken = default);

        Task DeleteAsync(string objectKey, CancellationToken cancellationToken = default);

        Task<bool> ExistsAsync(string objectKey, CancellationToken cancellationToken = default);

        /// <summary>
        /// Signs a temporary GET URL for <paramref name="objectKey"/>. Pure local crypto - no
        /// network round-trip - so it stays synchronous per the codebase-wide async rule
        /// (CLAUDE.md section 3, "Async design"). Returns null for a null/blank key.
        /// </summary>
        string? GetPresignedUrl(string? objectKey);

        /// <summary>
        /// Coerces whatever the client sent back into a bare object key: a key passes through
        /// unchanged, and a full URL (signed or not, from this bucket) is stripped down to its key.
        /// This is what makes the round-trip safe when a frontend reads <c>ImageUrl</c> off a
        /// detail response and echoes it straight back into the update command.
        /// Pure string work, hence synchronous. Returns null for a null/blank/foreign input.
        /// </summary>
        string? NormalizeKey(string? keyOrUrl);
    }
}
