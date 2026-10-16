using System.Reflection;
using Application.Common.Audit;
using Application.Common.Contracts.Audit;
using MediatR;

namespace Application.Common.Behaviors
{
    /// <summary>
    /// Tells the audit scope which command is running, so every row it saves is recorded under that action. The rows
    /// themselves are captured by WMSDbContext.SaveChangesAsync - nothing here touches the database.
    /// </summary>
    public class AuditBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
        where TRequest : notnull
    {
        // Read once per closed generic type, not on every request.
        private static readonly AuditActionAttribute? Attribute = typeof(TRequest).GetCustomAttribute<AuditActionAttribute>();

        private readonly IAuditScope _auditScope;

        public AuditBehavior(IAuditScope auditScope)
        {
            _auditScope = auditScope;
        }

        public async Task<TResponse> Handle(TRequest request, RequestHandlerDelegate<TResponse> next, CancellationToken cancellationToken)
        {
            if (Attribute == null)
                return await next(cancellationToken);

            using (_auditScope.Begin(Attribute.Action))
                return await next(cancellationToken);
        }
    }
}
