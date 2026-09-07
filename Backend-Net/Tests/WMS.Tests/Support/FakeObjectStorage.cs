using Application.Common.Contracts.Storage;
using Application.Common.Enums;
using Common.Exceptions;

namespace WMS.Tests.Support
{
    /// <summary>
    /// An in-memory stand-in for <see cref="IObjectStorageService"/> so handler tests never touch
    /// a real bucket. The URL shape mirrors the real signed-URL contract closely enough for tests
    /// to assert on it: a fixed host, the key in the path, and a query string that stands in for
    /// the signature (so <see cref="NormalizeKey"/> round-trips are exercised for real).
    /// </summary>
    public class FakeObjectStorage : IObjectStorageService
    {
        public const string Host = "https://test-bucket.storage.example";

        /// <summary>Stands in for ObjectStorageOptions.PublicBaseUrl - the API's own host.</summary>
        public const string ApiHost = "https://api.test.example";

        /// <summary>
        /// Shared instance for the many handler tests that only reach the pure, stateless half of
        /// the interface (NormalizeKey / GetPresignedUrl). Tests that actually upload or delete
        /// must construct their own instance - <see cref="Objects"/> is mutable and xUnit runs
        /// test classes in parallel.
        /// </summary>
        public static readonly FakeObjectStorage Instance = new();

        public Dictionary<string, byte[]> Objects { get; } = new();

        public Task<UploadedFileDto> UploadAsync(Stream content, string fileName, string? contentType, ImageFolderEnum folder, CancellationToken cancellationToken = default)
        {
            using var buffer = new MemoryStream();
            content.CopyTo(buffer);

            // Mirrors LiaraObjectStorageService: the uploader's own file name, reduced to a single
            // path segment, with a numeric suffix when that name is already taken.
            var key = ResolveAvailableKey(fileName);
            Objects[key] = buffer.ToArray();

            return Task.FromResult(new UploadedFileDto
            {
                ObjectKey = key,
                Url = GetFixedUrl(key),
                FileName = key,
                ContentType = contentType,
                Size = buffer.Length,
            });
        }

        private string ResolveAvailableKey(string fileName)
        {
            var name = fileName ?? string.Empty;
            var lastSeparator = name.LastIndexOfAny(new[] { '/', '\\' });
            if (lastSeparator >= 0)
                name = name.Substring(lastSeparator + 1);

            var key = new string(name.Where(c => !char.IsControl(c)).ToArray()).Trim().Trim('.');
            if (string.IsNullOrWhiteSpace(key))
                key = Guid.NewGuid().ToString("N");

            if (!Objects.ContainsKey(key))
                return key;

            var extension = Path.GetExtension(key);
            var stem = key.Substring(0, key.Length - extension.Length);

            for (var suffix = 1; ; suffix++)
            {
                var candidate = $"{stem}-{suffix}{extension}";
                if (!Objects.ContainsKey(candidate))
                    return candidate;
            }
        }

        public Task DeleteAsync(string objectKey, CancellationToken cancellationToken = default)
        {
            var key = NormalizeKey(objectKey);
            if (key != null)
                Objects.Remove(key);
            return Task.CompletedTask;
        }

        public Task<bool> ExistsAsync(string objectKey, CancellationToken cancellationToken = default)
        {
            var key = NormalizeKey(objectKey);
            return Task.FromResult(key != null && Objects.ContainsKey(key));
        }

        public Task<StoredFileDto> DownloadAsync(string objectKey, CancellationToken cancellationToken = default)
        {
            var key = NormalizeKey(objectKey);
            if (key == null || !Objects.TryGetValue(key, out var content))
                throw new NotFoundCustomException("تصویر مورد نظر یافت نشد.");

            return Task.FromResult(new StoredFileDto
            {
                Content = content,
                ContentType = "image/jpeg",
                FileName = Path.GetFileName(key),
            });
        }

        /// <summary>
        /// Mirrors the real service: an URL on the API itself, carrying the key in the query
        /// string, so <see cref="NormalizeKey"/> round-trips are exercised for real.
        /// </summary>
        public string? GetFixedUrl(string? objectKey)
        {
            var key = NormalizeKey(objectKey);
            return key == null ? null : $"{ApiHost}/api/File/GetImage?objectKey={Uri.EscapeDataString(key)}";
        }

        public string? GetExpirableUrl(string? objectKey)
        {
            var key = NormalizeKey(objectKey);
            return key == null ? null : $"{Host}/{key}?signature=test";
        }

        public string? NormalizeKey(string? keyOrUrl)
        {
            if (string.IsNullOrWhiteSpace(keyOrUrl))
                return null;

            var value = keyOrUrl.Trim();

            if (!Uri.TryCreate(value, UriKind.Absolute, out var uri) || (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps))
                return value.TrimStart('/');

            // api/File/GetImage carries the key in the query string, not the path.
            var query = System.Web.HttpUtility.ParseQueryString(uri.Query);
            var fromQuery = query["objectKey"];
            if (!string.IsNullOrWhiteSpace(fromQuery))
                return fromQuery.TrimStart('/');

            var path = Uri.UnescapeDataString(uri.AbsolutePath).TrimStart('/');
            return string.IsNullOrWhiteSpace(path) ? null : path;
        }
    }
}
