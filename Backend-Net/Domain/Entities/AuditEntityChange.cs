using Domain.Enums;

namespace Domain.Entities
{
    /// <summary>
    /// One database row that an <see cref="AuditEvent"/> inserted, updated or deleted. Append-only, no IsActive.
    /// </summary>
    public class AuditEntityChange
    {
        public long Id { get; set; }

        public long AuditEventId { get; set; }
        public AuditEvent AuditEvent { get; set; } = null!;

        /// <summary>The entity class name, e.g. "SaleItem".</summary>
        public string EntityType { get; set; } = null!;

        /// <summary>
        /// The row's primary key as text - "42", or "5,3" for a composite key (UserPermission, ProductVehicle) in key order.
        /// Text so one column serves every table.
        /// </summary>
        public string EntityKey { get; set; } = null!;

        public AuditOperationEnum Operation { get; set; }

        /// <summary>
        /// The document the row belongs to (sale 42 for a SaleItem, a payment, an installment of its plan...), so a
        /// document's history is one indexed lookup. Null for rows that belong to no document (a customer, a product).
        /// </summary>
        public DocumentKindEnum? DocumentKind { get; set; }
        public int? DocumentId { get; set; }

        /// <summary>
        /// JSON object of column -&gt; value before the change: the changed columns only for an update, the whole row for a
        /// delete, null for an insert. <see cref="NewValues"/> mirrors it (whole row for an insert, null for a delete).
        /// </summary>
        public string? OldValues { get; set; }
        public string? NewValues { get; set; }
    }
}
