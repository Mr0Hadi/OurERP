namespace Domain.Enums
{
    /// <summary>
    /// Marks a <see cref="PermissionEnum"/> member as restricted: it is invisible to anyone who
    /// does not already hold it, and can only be granted or revoked by someone who does.
    ///
    /// This is what keeps a part of the system out of reach of the ordinary administrator. Plain
    /// <c>PermissionManage</c> is self-escalating by nature - whoever has it can grant themselves
    /// anything they can see - so "cannot see it, cannot grant it" is the only rule that actually
    /// holds them out, rather than a convention that they are asked to respect.
    ///
    /// No permission carries this today. The first holder of a restricted permission is always a
    /// row inserted directly into <c>UserPermissions</c> by hand; from then on they can delegate
    /// it through the normal screen.
    /// </summary>
    [AttributeUsage(AttributeTargets.Field)]
    public sealed class RestrictedPermissionAttribute : Attribute
    {
    }
}
