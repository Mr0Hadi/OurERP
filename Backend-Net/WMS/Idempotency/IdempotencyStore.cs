using Microsoft.Extensions.Caching.Memory;

namespace WMS.Idempotency
{
    /// <summary>A response kept so a repeated request with the same Idempotency-Key gets it back unchanged.</summary>
    public sealed record IdempotentResponse(int StatusCode, string? ContentType, byte[] Body);

    public enum IdempotencyBeginResultEnum
    {
        /// <summary>First time this key is seen: run the request, then Complete or Abandon.</summary>
        STARTED,

        /// <summary>The key already finished with the same request: send the stored response back.</summary>
        REPLAY,

        /// <summary>The first request with this key is still running.</summary>
        IN_PROGRESS,

        /// <summary>The key was already used for a different request (other endpoint or other body).</summary>
        KEY_REUSED,
    }

    /// <summary>
    /// Idempotency-Key bookkeeping, held in the process's IMemoryCache. A key goes through two states: in flight (no response
    /// yet) and completed (response stored for <see cref="Retention"/>). Only a successful response is stored; a failed one
    /// releases the key, so a retry runs again - failed writes do not save anything, so running them again is safe.
    ///
    /// Single-process on purpose, like the permission cache: running several API instances behind a load balancer would need
    /// a shared store (Redis or a table) behind this same class.
    /// </summary>
    public sealed class IdempotencyStore
    {
        /// <summary>How long a completed response is replayed.</summary>
        public static readonly TimeSpan Retention = TimeSpan.FromHours(24);

        /// <summary>How long an in-flight key blocks a duplicate if its request never finishes (process killed mid-request).</summary>
        public static readonly TimeSpan InFlightTimeout = TimeSpan.FromMinutes(5);

        /// <summary>Responses larger than this are not stored; the key is released instead.</summary>
        public const int MaxStoredBodyBytes = 2 * 1024 * 1024;

        private sealed class Entry
        {
            public required string Fingerprint { get; init; }
            public IdempotentResponse? Response { get; init; }
        }

        private readonly IMemoryCache _cache;
        private readonly object _gate = new();

        public IdempotencyStore(IMemoryCache cache)
        {
            _cache = cache;
        }

        public IdempotencyBeginResultEnum Begin(string key, string fingerprint, out IdempotentResponse? stored)
        {
            lock (_gate)
            {
                if (_cache.TryGetValue(CacheKey(key), out Entry? entry) && entry != null)
                {
                    stored = entry.Response;
                    if (entry.Fingerprint != fingerprint)
                        return IdempotencyBeginResultEnum.KEY_REUSED;
                    return entry.Response == null ? IdempotencyBeginResultEnum.IN_PROGRESS : IdempotencyBeginResultEnum.REPLAY;
                }

                _cache.Set(CacheKey(key), new Entry { Fingerprint = fingerprint }, InFlightTimeout);
                stored = null;
                return IdempotencyBeginResultEnum.STARTED;
            }
        }

        public void Complete(string key, string fingerprint, IdempotentResponse response)
        {
            lock (_gate)
                _cache.Set(CacheKey(key), new Entry { Fingerprint = fingerprint, Response = response }, Retention);
        }

        public void Abandon(string key)
        {
            lock (_gate)
                _cache.Remove(CacheKey(key));
        }

        private static string CacheKey(string key) => $"Idempotency:{key}";
    }
}
