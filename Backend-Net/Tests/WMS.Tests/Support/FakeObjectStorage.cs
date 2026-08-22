using Application.Common.Contracts.Storage;
using Application.Common.Enums;

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

            var key = $"{folder.ToString().ToLowerInvariant()}/{Guid.NewGuid():N}{Path.GetExtension(fileName)}";
            Objects[key] = buffer.ToArray();

            return Task.FromResult(new UploadedFileDto
            {
                ObjectKey = key,
                Url = GetPresignedUrl(key),
                FileName = fileName,
                ContentType = contentType,
                Size = buffer.Length,
            });
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

        public string? GetPresignedUrl(string? objectKey)
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

            var path = Uri.UnescapeDataString(uri.AbsolutePath).TrimStart('/');
            return string.IsNullOrWhiteSpace(path) ? null : path;
        }
    }
}
