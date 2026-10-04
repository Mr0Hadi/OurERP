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
        /// <summary>
        /// With more than one permission the user needs ANY of them, not all:
        /// <c>[HasPermission(PermissionEnum.PosTerminalView, PermissionEnum.PosCharge)]</c> lets a cashier
        /// who may charge a card see the device list without also being able to view terminal settings.
        /// </summary>
        public HasPermissionAttribute(PermissionEnum permission, params PermissionEnum[] orAnyOf)
            : base(PolicyNameOf(new[] { permission }.Concat(orAnyOf)))
        {
            Permissions = new[] { permission }.Concat(orAnyOf).Distinct().ToArray();
        }

        /// <summary>Any one of these is enough.</summary>
        public IReadOnlyList<PermissionEnum> Permissions { get; }

        /// <summary>
        /// The policy name registered for a permission. The enum member's name, so the policies
        /// registered at startup and the ones asked for here can never drift apart.
        /// </summary>
        public static string PolicyNameOf(PermissionEnum permission) => permission.ToString();

        /// <summary>Several permissions: their names joined with "|", in a fixed order.</summary>
        public static string PolicyNameOf(IEnumerable<PermissionEnum> permissions)
            => string.Join("|", permissions.Distinct().OrderBy(x => (int)x).Select(PolicyNameOf));
    }
}
