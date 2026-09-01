using Domain.Enums;

namespace Domain.Entities
{
    /// <summary>
    /// A scanned/photographed invoice (or other document) attached to a Purchase or Sale.
    /// No FK/navigation to the owning row on purpose - <see cref="DocumentKind"/> +
    /// <see cref="DocumentId"/> is a loose reference (like a polymorphic association), so one
    /// table can back every document kind instead of four near-identical tables. See
    /// docs/invoice-attachment-requirements.fa.md.
    /// </summary>
    public class DocumentAttachment
    {
        public int Id { get; set; }

        public DocumentKindEnum DocumentKind { get; set; }

        /// <summary>Id of the owning Purchase/Sale/etc, scoped by <see cref="DocumentKind"/>.</summary>
        public int DocumentId { get; set; }

        /// <summary>Object key in the bucket - never a URL, which would expire. See IObjectStorageService.</summary>
        public string ObjectKey { get; set; } = string.Empty;

        public string? FileName { get; set; }
        public string? Note { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
