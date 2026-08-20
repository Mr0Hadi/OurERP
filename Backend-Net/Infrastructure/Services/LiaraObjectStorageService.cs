using Amazon.S3;
using Amazon.S3.Model;
using Application.Common.Contracts.Storage;
using Application.Common.Enums;
using Common.Exceptions;
using Microsoft.Extensions.Options;

namespace Infrastructure.Services
{
    /// <summary>
    /// Liara object storage is S3-compatible, so this is the AWS SDK pointed at Liara's endpoint
    /// with path-style addressing forced on - the shape the Liara .NET sample uses
    /// (https://github.com/liara-cloud/dotnet-getting-started/tree/object-storage). Swapping in
    /// any other S3-compatible provider is a config change, not a code change.
    /// </summary>
    public class LiaraObjectStorageService : IObjectStorageService
    {
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

            var objectKey = BuildObjectKey(fileName, folder);

            var putRequest = new PutObjectRequest
            {
                BucketName = _options.BucketName,
                Key = objectKey,
                InputStream = content,
                ContentType = string.IsNullOrWhiteSpace(contentType) ? "application/octet-stream" : contentType,
                DisablePayloadSigning = true,
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
                Url = GetPresignedUrl(objectKey),
                FileName = Path.GetFileName(fileName),
                ContentType = contentType,
                Size = content.CanSeek ? content.Length : 0,
            };
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

        public string? GetPresignedUrl(string? objectKey)
        {
            var key = NormalizeKey(objectKey);
            if (string.IsNullOrWhiteSpace(key))
                return null;

            // Signing is called from every list/detail query, so an unconfigured bucket must
            // degrade to "no image" rather than 500 a whole page of customers. Uploads still fail
            // loudly (see UploadAsync) - that's where a misconfiguration should surface.
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

            if (!Uri.TryCreate(value, UriKind.Absolute, out var uri) || (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps))
                return value.TrimStart('/');

            // A full URL: drop the query string (that's the expired signature) and the bucket
            // segment, whichever addressing style produced it.
            var path = Uri.UnescapeDataString(uri.AbsolutePath).TrimStart('/');

            // Path-style: {endpoint}/{bucket}/{key}
            var bucketPrefix = _options.BucketName + "/";
            if (path.StartsWith(bucketPrefix, StringComparison.OrdinalIgnoreCase))
                path = path.Substring(bucketPrefix.Length);

            // Virtual-host style ({bucket}.{endpoint}/{key}) needs nothing further - the bucket
            // was in the host, so the path is already the key.
            return string.IsNullOrWhiteSpace(path) ? null : path;
        }

        /// <summary>
        /// Keys are always server-generated: a folder prefix, a yyyy/MM shard so the bucket stays
        /// navigable, and a Guid. The client's file name only ever contributes its extension, so a
        /// name like <c>../../etc/passwd</c> or a duplicate name can't do anything.
        /// </summary>
        private static string BuildObjectKey(string fileName, ImageFolderEnum folder)
        {
            var extension = Path.GetExtension(fileName)?.ToLowerInvariant();
            if (string.IsNullOrWhiteSpace(extension) || extension.Length > 10)
                extension = string.Empty;

            var prefix = folder.ToString().ToLowerInvariant();
            var now = DateTime.UtcNow;

            return $"{prefix}/{now:yyyy}/{now:MM}/{Guid.NewGuid():N}{extension}";
        }
    }
}
