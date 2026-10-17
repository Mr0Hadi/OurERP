using Application.Common.Contracts.Context;
using Application.Common.Contracts.Settings;
using Application.Common.Settings;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace Infrastructure.Services
{
    public class SystemSettingService : ISystemSettingService
    {
        // Invalidate() is the real freshness guarantee; the expiry only covers a row edited directly in the database.
        private static readonly TimeSpan CacheDuration = TimeSpan.FromMinutes(5);
        private const string CacheKey = "SystemSettings";

        private readonly IWMSDbContext _context;
        private readonly IMemoryCache _memoryCache;

        public SystemSettingService(IWMSDbContext context, IMemoryCache memoryCache)
        {
            _context = context;
            _memoryCache = memoryCache;
        }

        public async Task<long> GetIntegerAsync(SystemSettingDefinition setting, CancellationToken cancellationToken = default) =>
            long.Parse(await GetTextAsync(setting, cancellationToken), System.Globalization.CultureInfo.InvariantCulture);

        public async Task<bool> GetBooleanAsync(SystemSettingDefinition setting, CancellationToken cancellationToken = default) =>
            bool.Parse(await GetTextAsync(setting, cancellationToken));

        public async Task<string> GetTextAsync(SystemSettingDefinition setting, CancellationToken cancellationToken = default)
        {
            var stored = await GetStoredAsync(cancellationToken);

            // A stored value that no longer fits the catalogue (limits tightened in a later release) falls back to the default
            // rather than breaking every command that reads it.
            return stored.TryGetValue(setting.Key, out var value) && setting.Normalize(value, out _) is { } normalized
                ? normalized
                : setting.DefaultValue;
        }

        public void Invalidate() => _memoryCache.Remove(CacheKey);

        private async Task<IReadOnlyDictionary<string, string>> GetStoredAsync(CancellationToken cancellationToken)
        {
            if (_memoryCache.TryGetValue(CacheKey, out IReadOnlyDictionary<string, string>? cached) && cached != null)
                return cached;

            var stored = await _context.SystemSettings
                .AsNoTracking()
                .ToDictionaryAsync(x => x.Key, x => x.Value, StringComparer.OrdinalIgnoreCase, cancellationToken);

            _memoryCache.Set(CacheKey, (IReadOnlyDictionary<string, string>)stored, CacheDuration);
            return stored;
        }
    }
}
