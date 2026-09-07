using Application.Common.Enums;

namespace Application.Common.Contracts.Storage
{
    /// <summary>
    /// The one seam onto the cloud bucket. Nothing outside <c>Infrastructure/Services</c> knows
    /// the storage is S3-shaped.
    ///
    /// IMPORTANT - why no storage URL is ever handed to a browser: Liara's object-storage edge
    /// (<c>*.storage.c2.liara.site</c>, both path-style and virtual-host style) rejects any request
    /// whose <c>User-Agent</c> looks like a browser - anything containing Mozilla/Chrome/Safari/
    /// Firefox - and answers a plain-text <c>404 page not found</c> from its router, never reaching
    /// the S3 gateway. That happens whether the object exists or not, whether the bucket is public
    /// or the URL is presigned, so a storage URL in an &lt;img src&gt; can only ever 404. Verified
    /// by bisecting the request headers against a known-good object: identical URL, curl/SDK
    /// User-Agent =&gt; 200, browser User-Agent =&gt; 404.
    ///
    /// So the bytes come back through this API instead: <see cref="GetFixedUrl"/> returns a URL on
    /// our own host (<c>GET api/File/GetImage</c>) and <see cref="DownloadAsync"/> fetches the
    /// object server-side, where the SDK's own User-Agent is not blocked.
    ///
    /// What gets persisted in the database is still the object KEY
    /// (e.g. <c>products/2026/09/3f1c....jpg</c>), never a URL. Read-side DTOs carry both:
    /// <c>ImageKey</c> (the stable value to send back on the next update) and <c>ImageUrl</c>
    /// (a ready-to-render URL for &lt;img src&gt;).
    /// </summary>
    public interface IObjectStorageService
    {
        /// <summary>
        /// Streams <paramref name="content"/> into the bucket and returns the stored object key.
        /// </summary>
        Task<UploadedFileDto> UploadAsync(Stream content, string fileName, string? contentType, ImageFolderEnum folder, CancellationToken cancellationToken = default);

        Task DeleteAsync(string objectKey, CancellationToken cancellationToken = default);

        Task<bool> ExistsAsync(string objectKey, CancellationToken cancellationToken = default);

        /// <summary>
        /// Pulls an object back out of the bucket so the API can serve it itself. This is the only
        /// way a browser ever gets to see these bytes - see the type-level note on the provider's
        /// User-Agent block. Throws <see cref="Common.Exceptions.NotFoundCustomException"/> when the
        /// key is not in the bucket.
        /// </summary>
        Task<StoredFileDto> DownloadAsync(string objectKey, CancellationToken cancellationToken = default);

        /// <summary>
        /// A browser-loadable URL for <paramref name="objectKey"/>, pointing at this API's own
        /// <c>GET api/File/GetImage</c> rather than at the bucket. Pure string work - no network
        /// round-trip - so it stays synchronous per the codebase-wide async rule (CLAUDE.md
        /// section 3). Returns null for a null/blank key.
        /// </summary>
        string? GetFixedUrl(string? objectKey);

        /// <summary>
        /// A short-lived presigned URL straight at the bucket. Correctly signed and it works from
        /// curl, the SDK, or any server-to-server client - but NOT from a browser, for the reason
        /// documented on this interface. Kept for machine-to-machine consumers; never put this in
        /// an &lt;img src&gt; or hand it to the frontend.
        /// </summary>
        string? GetExpirableUrl(string? objectKey);

        /// <summary>
        /// Coerces whatever the client sent back into a bare object key: a key passes through
        /// unchanged, and a full URL is stripped down to its key - our own
        /// <c>api/File/GetImage?objectKey=...</c> (key in the query string), a path-style bucket URL
        /// (<c>{endpoint}/{bucket}/{key}</c>) and a virtual-host one (<c>{bucket}.{endpoint}/{key}</c>)
        /// alike. This is what makes the round-trip safe when a frontend reads <c>ImageUrl</c> off a
        /// detail response and echoes it straight back into the update command.
        /// Pure string work, hence synchronous. Returns null for a null/blank input.
        /// </summary>
        string? NormalizeKey(string? keyOrUrl);
    }
}
