using Domain.Enums;

namespace Application.Common.Audit
{
    /// <summary>
    /// Names the audit event a command's changes are recorded under. Read by <see cref="Behaviors.AuditBehavior{TRequest,TResponse}"/>.
    /// Every command carries one and no query does (AuditActionCoverageTests).
    /// </summary>
    [AttributeUsage(AttributeTargets.Class, Inherited = false)]
    public sealed class AuditActionAttribute : Attribute
    {
        public AuditActionAttribute(AuditActionEnum action)
        {
            Action = action;
        }

        public AuditActionEnum Action { get; }
    }
}
