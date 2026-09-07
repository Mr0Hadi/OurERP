using Amazon.S3;
using Amazon.S3.Model;
using Application.Common.Contracts.Storage;
using Application.Common.Enums;
using Common.Exceptions;
using Microsoft.Extensions.Options;

namespace Infrastructure.Services
{
    /// <summary>
    /// Liara object storage is S3-compatible, so this is the AWS SDK pointed at Liara's endpoint -
    /// the shape the Liara .NET sample uses
    /// (https://github.com/liara-cloud/dotnet-getting-started/tree/object-storage). Swapping in
    /// any other S3-compatible provider is a config change, not a code change.
    ///
    /// Reads are served through this API rather than by linking straight at the bucket; see
    /// <see cref="IObjectStorageService"/> for why (the provider's edge 404s browser User-Agents).
    /// </summary>
    public class LiaraObjectStorageService : IObjectStorageService
    {
        /// <summary>
        /// The route <see cref="GetFixedUrl"/> points at, and the query parameter
        /// <see cref="NormalizeKey"/> reads a key back out of. Kept next to each other so the two
        /// halves of the round-trip cannot drift apart; must match
        /// <c>WMS/Controllers/FileController.GetImage</c> and <c>GetImageFileQuery.ObjectKey</c>.
        /// </summary>
        private const string ImageRoute = "api/File/GetImage";
        private const string ObjectKeyQueryParameter = "objectKey";

        /// <summary>
        /// How many "name-1, name-2, ..." probes to make before giving up on a readable key and
        /// falling back to a unique suffix. Each probe is a HEAD round-trip, so this bounds the
        /// worst case; a bucket with 50 files of the same name is pathological, not normal.
        /// </summary>
        private const int MaxCollisionProbes = 50;

        private readonly IAmazonS3 _s3Client;
        private readonly ObjectStorageOptions _options;

        public LiaraObjectStorageService(IAmazonS3 s3Client, IOptions<ObjectStorageOptions> options)
        {
            _s3Client = s3Client;
            _options = options.Value;
        }

        private bool IsConfigured =>
            !string.IsNullOrWhiteSpace(_options.Endpoint)
            && !string.IsNullOrWhiteSpace(_options.BucketName)
            && !string.IsNullOrWhiteSpace(_options.AccessKey)
            && !string.IsNullOrWhiteSpace(_options.SecretKey);

        public async Task<UploadedFileDto> UploadAsync(Stream content, string fileName, string? contentType, ImageFolderEnum folder, CancellationToken cancellationToken = default)
        {
            if (!IsConfigured)
                throw new ServiceUnavailableCustomException("فضای ذخیره‌سازی ابری پیکربندی نشده است.");

            var objectKey = await ResolveAvailableKeyAsync(fileName, cancellationToken);

            var putRequest = new PutObjectRequest
            {
                BucketName = _options.BucketName,
                Key = objectKey,
                InputStream = content,
                // Stored on the object and handed straight back by DownloadAsync, so the browser
                // renders the image inline instead of downloading an octet-stream. Without it the
                // provider only guesses from the extension.
                ContentType = string.IsNullOrWhiteSpace(contentType) ? "application/octet-stream" : contentType,
            };

            try
            {
                await _s3Client.PutObjectAsync(putRequest, cancellationToken);
            }
            catch (AmazonS3Exception ex)
            {
                throw new ServiceUnavailableCustomException($"بارگذاری فایل در فضای ابری با خطا مواجه شد. ({ex.Message})");
            }

            return new UploadedFileDto
            {
                ObjectKey = objectKey,
                Url = GetFixedUrl(objectKey),
                FileName = objectKey,
                ContentType = contentType,
                Size = content.CanSeek ? content.Length : 0,
            };
        }

        /// <summary>
        /// Keys keep the uploader's own file name - they are meant to be recognisable in the
        /// bucket listing - so a name that is already taken gets a numeric suffix
        /// (<c>logo.png</c> → <c>logo-1.png</c> → <c>logo-2.png</c>) instead of silently
        /// overwriting the existing object.
        ///
        /// This is check-then-put, not an atomic reservation: S3's conditional write
        /// (<c>If-None-Match: *</c>) is ignored by this provider - tested against the live bucket,
        /// the second PUT returned 200 and clobbered the first - so there is no way to make it
        /// atomic here. Two uploads of the same name landing in the same instant can still collide;
        /// the window is a single round-trip and the consequence is one replaced image, which is
        /// what happened on *every* upload before this existed.
        /// </summary>
        private async Task<string> ResolveAvailableKeyAsync(string fileName, CancellationToken cancellationToken)
        {
            var key = SanitizeFileName(fileName);

            if (!await ExistsAsync(key, cancellationToken))
                return key;

            var extension = Path.GetExtension(key);
            var stem = key.Substring(0, key.Length - extension.Length);

            for (var suffix = 1; suffix <= MaxCollisionProbes; suffix++)
            {
                var candidate = $"{stem}-{suffix}{extension}";
                if (!await ExistsAsync(candidate, cancellationToken))
                    return candidate;
            }

            // Give up on a pretty name rather than on the upload: a rejected upload loses the
            // user's file, an ugly key costs nothing.
            return $"{stem}-{Guid.NewGuid():N}{extension}";
        }

        /// <summary>
        /// The file name is client-controlled and becomes the object key verbatim, so it is
        /// reduced to a single path segment first: a name like <c>../../products/logo.png</c> must
        /// not get to pick its own prefix in the bucket. Control characters go too - they cannot
        /// survive a URL round-trip and read as corruption in the bucket listing.
        /// </summary>
        private static string SanitizeFileName(string? fileName)
        {
            var name = fileName ?? string.Empty;

            // Both separators regardless of host OS - the name comes off an HTTP request, not off
            // this machine's filesystem, so Path.GetFileName's platform-dependent split is wrong here.
            var lastSeparator = name.LastIndexOfAny(new[] { '/', '\\' });
            if (lastSeparator >= 0)
                name = name.Substring(lastSeparator + 1);

            var cleaned = new string(name.Where(c => !char.IsControl(c)).ToArray())
                .Trim()
                .Trim('.');

            return string.IsNullOrWhiteSpace(cleaned) ? Guid.NewGuid().ToString("N") : cleaned;
        }

        public async Task DeleteAsync(string objectKey, CancellationToken cancellationToken = default)
        {
            var key = NormalizeKey(objectKey);
            if (string.IsNullOrWhiteSpace(key))
                return;

            try
            {
                await _s3Client.DeleteObjectAsync(new DeleteObjectRequest
                {
                    BucketName = _options.BucketName,
                    Key = key,
                }, cancellationToken);
            }
            catch (AmazonS3Exception ex)
            {
                throw new ServiceUnavailableCustomException($"حذف فایل از فضای ابری با خطا مواجه شد. ({ex.Message})");
            }
        }

        public async Task<bool> ExistsAsync(string objectKey, CancellationToken cancellationToken = default)
        {
            var key = NormalizeKey(objectKey);
            if (string.IsNullOrWhiteSpace(key))
                return false;

            try
            {
                await _s3Client.GetObjectMetadataAsync(new GetObjectMetadataRequest
                {
                    BucketName = _options.BucketName,
                    Key = key,
                }, cancellationToken);
                return true;
            }
            catch (AmazonS3Exception ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
            {
                return false;
            }
        }

        public async Task<StoredFileDto> DownloadAsync(string objectKey, CancellationToken cancellationToken = default)
        {
            if (!IsConfigured)
                throw new ServiceUnavailableCustomException("فضای ذخیره‌سازی ابری پیکربندی نشده است.");

            var key = NormalizeKey(objectKey);
            if (string.IsNullOrWhiteSpace(key))
                throw new NotFoundCustomException("تصویر مورد نظر یافت نشد.");

            try
            {
                using var response = await _s3Client.GetObjectAsync(new GetObjectRequest
                {
                    BucketName = _options.BucketName,
                    Key = key,
                }, cancellationToken);

                using var buffer = new MemoryStream();
                await response.ResponseStream.CopyToAsync(buffer, cancellationToken);

                return new StoredFileDto
                {
                    Content = buffer.ToArray(),
                    ContentType = string.IsNullOrWhiteSpace(response.Headers.ContentType)
                        ? "application/octet-stream"
                        : response.Headers.ContentType,
                    FileName = Path.GetFileName(key),
                };
            }
            catch (AmazonS3Exception ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
            {
                throw new NotFoundCustomException("تصویر مورد نظر یافت نشد.");
            }
            catch (AmazonS3Exception ex)
            {
                throw new ServiceUnavailableCustomException($"دریافت فایل از فضای ابری با خطا مواجه شد. ({ex.Message})");
            }
        }

        public string? GetFixedUrl(string? objectKey)
        {
            var key = NormalizeKey(objectKey);
            if (string.IsNullOrWhiteSpace(key))
                return null;

            // The key goes in the query string, so it is escaped as data - a key with '/' in it
            // (products/2026/09/x.jpg) must not turn into extra path segments.
            var relative = $"{ImageRoute}?{ObjectKeyQueryParameter}={Uri.EscapeDataString(key)}";

            if (string.IsNullOrWhiteSpace(_options.PublicBaseUrl))
                return "/" + relative;

            // AbsoluteUri, not ToString(): ToString() hands back the *unescaped* form, which would
            // undo the escaping above for any key containing a space or a non-ASCII character.
            return new Uri(new Uri(_options.PublicBaseUrl.TrimEnd('/') + "/"), relative).AbsoluteUri;
        }

        public string? GetExpirableUrl(string? objectKey)
        {
            var key = NormalizeKey(objectKey);
            if (string.IsNullOrWhiteSpace(key))
                return null;

            // Signing is called from list/detail paths too, so an unconfigured bucket must degrade
            // to "no image" rather than 500 a whole page. Uploads still fail loudly (see
            // UploadAsync) - that is where a misconfiguration should surface.
            if (!IsConfigured)
                return null;

            // GetPreSignedURL is local HMAC signing, not a service call - no await to drop here.
            return _s3Client.GetPreSignedURL(new GetPreSignedUrlRequest
            {
                BucketName = _options.BucketName,
                Key = key,
                Verb = HttpVerb.GET,
                Expires = DateTime.UtcNow.AddMinutes(_options.PresignedUrlExpiryMinutes),
            });
        }

        public string? NormalizeKey(string? keyOrUrl)
        {
            if (string.IsNullOrWhiteSpace(keyOrUrl))
                return null;

            var value = keyOrUrl.Trim();

            if (!Uri.TryCreate(value, UriKind.Absolute, out var uri)
                || (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps))
            {
                // Not an absolute http(s) URL. A leading '/' means it is still one of our own
                // relative image URLs (GetFixedUrl returns those when PublicBaseUrl is unset), so
                // give it a host to make it parseable; anything else is already a bare key.
                if (!value.StartsWith('/'))
                    return value;

                uri = new Uri(new Uri("http://localhost"), value);
            }

            // Our own image URL carries the key in the query string, not the path.
            var fromQuery = ReadObjectKeyQueryParameter(uri.Query);
            if (fromQuery != null)
                return fromQuery;

            // A direct bucket URL: drop the query string (that is the expired signature) and the
            // bucket segment if this was path-style. Virtual-host style ({bucket}.{endpoint}/{key})
            // needs nothing further - the bucket was in the host, so the path is already the key.
            var path = Uri.UnescapeDataString(uri.AbsolutePath).TrimStart('/');

            var bucketPrefix = _options.BucketName + "/";
            if (path.StartsWith(bucketPrefix, StringComparison.OrdinalIgnoreCase))
                path = path.Substring(bucketPrefix.Length);

            return string.IsNullOrWhiteSpace(path) ? null : path;
        }

        private static string? ReadObjectKeyQueryParameter(string query)
        {
            if (string.IsNullOrEmpty(query))
                return null;

            foreach (var pair in query.TrimStart('?').Split('&', StringSplitOptions.RemoveEmptyEntries))
            {
                var separator = pair.IndexOf('=');
                if (separator <= 0)
                    continue;

                if (!pair.AsSpan(0, separator).Equals(ObjectKeyQueryParameter, StringComparison.OrdinalIgnoreCase))
                    continue;

                var key = Uri.UnescapeDataString(pair.Substring(separator + 1)).TrimStart('/');
                return string.IsNullOrWhiteSpace(key) ? null : key;
            }

            return null;
        }
    }
}
