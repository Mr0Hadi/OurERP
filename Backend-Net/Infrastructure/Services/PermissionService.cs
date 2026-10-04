using Application.Common.Contracts.Context;
using Application.Common.Contracts.Permissions;
using Common.Exceptions;
using Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace Infrastructure.Services
{
    public class PermissionService : IPermissionService
    {
        // A sliding window is enough on its own to bound staleness, but the real freshness
        // guarantee is Invalidate(), which every write path calls. The expiry is only a safety
        // net for a row changed directly in the database - which is exactly how the first
        // super-user permission is granted.
        private static readonly TimeSpan CacheDuration = TimeSpan.FromMinutes(5);

        private readonly IWMSDbContext _context;
        private readonly IMemoryCache _memoryCache;

        public PermissionService(IWMSDbContext context, IMemoryCache memoryCache)
        {
            _context = context;
            _memoryCache = memoryCache;
        }

        public async Task<IReadOnlyCollection<PermissionEnum>> GetUserPermissionsAsync(int userId, CancellationToken cancellationToken = default)
        {
            if (_memoryCache.TryGetValue(CacheKey(userId), out IReadOnlyCollection<PermissionEnum>? cached) && cached != null)
                return cached;

            // x.User.IsActive, not just x.UserId: a soft-deleted user keeps their rows but must
            // hold nothing, so a token issued before they were deactivated stops opening doors.
            var permissions = await _context.UserPermissions
                .AsNoTracking()
                .Where(x => x.UserId == userId && x.User.IsActive)
                .Select(x => x.Permission)
                .ToListAsync(cancellationToken);

            _memoryCache.Set(CacheKey(userId), (IReadOnlyCollection<PermissionEnum>)permissions, CacheDuration);

            return permissions;
        }

        public async Task<bool> HasPermissionAsync(int userId, PermissionEnum permission, CancellationToken cancellationToken = default)
        {
            var permissions = await GetUserPermissionsAsync(userId, cancellationToken);

            return permissions.Contains(permission);
        }

        public void Invalidate(int userId) => _memoryCache.Remove(CacheKey(userId));

        public async Task EnsureCanManageUserAsync(int actorUserId, int targetUserId, CancellationToken cancellationToken = default)
        {
            if (actorUserId == targetUserId)
                return;

            var actorPermissions = await GetUserPermissionsAsync(actorUserId, cancellationToken);

            var targetPermissions = await _context.UserPermissions
                .AsNoTracking()
                .Where(x => x.UserId == targetUserId)
                .Select(x => x.Permission)
                .ToListAsync(cancellationToken);

            if (targetPermissions.Any(permission => !actorPermissions.Contains(permission)))
                throw new ForbiddenCustomException("این کاربر دسترسی‌هایی دارد که شما ندارید؛ به همین دلیل امکان انجام این عملیات روی حساب او را ندارید.");
        }

        private static string CacheKey(int userId) => $"UserPermissions:{userId}";
    }
}
