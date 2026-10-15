using Domain.Enums;

namespace Application.Common.Contracts.Audit
{
    /// <summary>
    /// The audit event the current request is writing into. Scoped: one per request, shared by the MediatR pipeline
    /// (which names the action) and WMSDbContext (which writes the rows).
    /// </summary>
    public interface IAuditScope
    {
        /// <summary>The outermost command's action, or null outside any command.</summary>
        AuditActionEnum? Action { get; }

        /// <summary>
        /// The AuditEvent already written for the current action, so a command that saves several times keeps adding to
        /// one event. Set by WMSDbContext; null until the action's first save.
        /// </summary>
        long? CurrentEventId { get; set; }

        /// <summary>
        /// Starts an action. Only the outermost call counts: a command sent from inside another command
        /// (CreateInPersonSale -&gt; CreateSale, ShipSale) records under the outer action. Disposing the outermost handle
        /// ends the action, so the next command gets a new event.
        /// </summary>
        IDisposable Begin(AuditActionEnum action);
    }
}
