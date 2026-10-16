using Domain.Enums;

namespace Domain.Entities
{
    /// <summary>
    /// One thing a user did - one outermost MediatR command - and every row it changed (<see cref="Changes"/>).
    /// Append-only: never edited or deleted, no IsActive. Written only by WMSDbContext.SaveChangesAsync, in the same
    /// transaction as the changes it records, so a change without its audit row (or the reverse) cannot exist.
    /// A command that saves several times (CreateProduct saves twice) still gets one event.
    /// </summary>
    public class AuditEvent
    {
        public long Id { get; set; }

        public DateTime OccurredAt { get; set; }

        /// <summary>
        /// Who was signed in. Null for an anonymous request (a failed login) or work outside a request. A plain id with no
        /// foreign key on purpose: recording a change must never be what makes the change fail.
        /// </summary>
        public int? UserId { get; set; }

        /// <summary>The command that made the change. Null when rows were saved outside any command (seeding, tooling).</summary>
        public AuditActionEnum? Action { get; set; }

        public List<AuditEntityChange> Changes { get; set; } = new();
    }
}
