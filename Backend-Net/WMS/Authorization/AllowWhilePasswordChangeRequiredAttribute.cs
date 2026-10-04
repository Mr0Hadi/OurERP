namespace WMS.Authorization
{
    /// <summary>
    /// Marks an action a user may still call while they have to change a password a manager reset
    /// (changing it, logging out, and the two reads the change-password screen needs). Every other
    /// authenticated action answers 403 until then - see PasswordChangeRequiredMiddleware.
    /// </summary>
    [AttributeUsage(AttributeTargets.Method | AttributeTargets.Class)]
    public sealed class AllowWhilePasswordChangeRequiredAttribute : Attribute
    {
    }
}
