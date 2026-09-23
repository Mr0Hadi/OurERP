using System.Reflection;
using Domain.Enums;

namespace Common.Extensions
{
    /// <summary>
    /// Metadata helpers over <see cref="PermissionEnum"/>. Pure reflection over in-memory enum
    /// members - no IO, so nothing here is async (section 3's async rule).
    /// </summary>
    public static class PermissionExtensions
    {
        /// <summary>Every defined permission, in declaration order.</summary>
        public static IReadOnlyList<PermissionEnum> All { get; } = Enum.GetValues<PermissionEnum>();

        // Reflection is not free and the answer never changes, so each member's attributes are
        // read once for the life of the process.
        private static readonly Dictionary<PermissionEnum, PermissionGroupEnum> Groups = All.ToDictionary(
            permission => permission,
            permission => Field(permission)
                .GetCustomAttribute<PermissionGroupAttribute>()?.Group
                // Loud rather than defaulted: a permission with no group would quietly vanish
                // from the admin screen, which groups by section. A unit test asserts this too.
                ?? throw new InvalidOperationException(
                    $"PermissionEnum.{permission} has no [PermissionGroup] attribute."));

        private static readonly HashSet<PermissionEnum> Restricted = All
            .Where(permission => Field(permission).GetCustomAttribute<RestrictedPermissionAttribute>() != null)
            .ToHashSet();

        public static PermissionGroupEnum GetGroup(this PermissionEnum permission) => Groups[permission];

        /// <summary>
        /// See <see cref="RestrictedPermissionAttribute"/>: only a holder may see or delegate it.
        /// </summary>
        public static bool IsRestricted(this PermissionEnum permission) => Restricted.Contains(permission);

        /// <summary>
        /// What <paramref name="held"/> lets its owner see and manage: every ordinary permission,
        /// plus the restricted ones they hold themselves. Used by both the read and the write
        /// side, so a permission can never be granted through a screen that would not show it.
        /// </summary>
        public static IReadOnlyCollection<PermissionEnum> ManageableBy(IReadOnlyCollection<PermissionEnum> held)
        {
            return All.Where(permission => !permission.IsRestricted() || held.Contains(permission)).ToList();
        }

        private static FieldInfo Field(PermissionEnum permission) =>
            typeof(PermissionEnum).GetField(permission.ToString())!;
    }
}
