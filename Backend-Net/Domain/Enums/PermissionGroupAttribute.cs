namespace Domain.Enums
{
    /// <summary>
    /// Puts a <see cref="PermissionEnum"/> member in a display group. Read through
    /// <c>Common.Extensions.PermissionExtensions.GetGroup()</c>.
    ///
    /// An attribute rather than a numbering convention (group = value / 10) so that adding a
    /// permission to a full group never forces a renumbering - the integers are persisted in
    /// <c>UserPermissions.Permission</c> and must never move.
    /// </summary>
    [AttributeUsage(AttributeTargets.Field)]
    public sealed class PermissionGroupAttribute : Attribute
    {
        public PermissionGroupAttribute(PermissionGroupEnum group)
        {
            Group = group;
        }

        public PermissionGroupEnum Group { get; }
    }
}
