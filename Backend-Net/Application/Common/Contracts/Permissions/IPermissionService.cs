using Domain.Enums;

namespace Application.Common.Contracts.Permissions
{
    /// <summary>
    /// The one place that answers "does this user hold this permission?". Reads the
    /// <c>UserPermissions</c> rows on every request (through a cache), rather than trusting
    /// claims baked into the JWT at login - so revoking a permission takes effect immediately
    /// instead of whenever the user's token happens to expire.
    /// </summary>
    public interface IPermissionService
    {
        /// <summary>
        /// Everything the user holds. A user who is missing or deactivated holds nothing, which
        /// is what makes every check fail closed.
        /// </summary>
        Task<IReadOnlyCollection<PermissionEnum>> GetUserPermissionsAsync(int userId, CancellationToken cancellationToken = default);

        Task<bool> HasPermissionAsync(int userId, PermissionEnum permission, CancellationToken cancellationToken = default);

        /// <summary>
        /// Drops the cached list for one user. Synchronous and void on purpose: it only touches
        /// the in-memory cache, there is no IO to await (section 3's async rule). Call it after
        /// anything that changes what a user holds - granting, revoking, deactivating.
        /// </summary>
        void Invalidate(int userId);
    }
}
