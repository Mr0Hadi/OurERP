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

        /// <summary>
        /// Throws <c>ForbiddenCustomException</c> unless the actor holds every permission the target
        /// holds. Guards everything one user does to another's account (reset password, edit,
        /// deactivate, move, force logout), so nobody can take over - or lock out - an account that
        /// can do more than they can. Acting on yourself always passes.
        /// Not applied to UpdateUserPermissions on purpose: a PermissionManage holder may grant any
        /// ordinary permission, themselves included, so the rule would hold nothing there - and it
        /// would stop a permission manager from editing anyone holding a permission they never needed.
        /// The target's rows count even while they are deactivated: otherwise deactivating an
        /// administrator would let anyone edit them back into use.
        /// </summary>
        Task EnsureCanManageUserAsync(int actorUserId, int targetUserId, CancellationToken cancellationToken = default);
    }
}
