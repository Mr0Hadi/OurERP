using Domain.Enums;
using Microsoft.AspNetCore.Authorization;

namespace WMS.Authorization
{
    /// <summary>
    /// Guards an endpoint with a permission: <c>[HasPermission(PermissionEnum.SaleShip)]</c>.
    ///
    /// A typed wrapper over <c>[Authorize(Policy = "SaleShip")]</c> so the permission is a
    /// compile-time reference rather than a magic string - renaming an enum member then moves
    /// every guard with it, and a typo is a build error instead of a policy that silently does
    /// not exist.
    /// </summary>
    [AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = true)]
    public sealed class HasPermissionAttribute : AuthorizeAttribute
    {
        public HasPermissionAttribute(PermissionEnum permission) : base(PolicyNameOf(permission))
        {
            Permission = permission;
        }

        public PermissionEnum Permission { get; }

        /// <summary>
        /// The policy name registered for a permission. The enum member's name, so the policies
        /// registered at startup and the ones asked for here can never drift apart.
        /// </summary>
        public static string PolicyNameOf(PermissionEnum permission) => permission.ToString();
    }
}
