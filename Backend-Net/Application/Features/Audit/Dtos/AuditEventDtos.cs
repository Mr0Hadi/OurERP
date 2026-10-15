using System.Text.Json;
using Domain.Enums;

namespace Application.Features.Audit.Dtos
{
    public class AuditEventListDto
    {
        public long Id { get; set; }
        public DateTime OccurredAt { get; set; }
        public int? UserId { get; set; }
        public string? UserName { get; set; }

        /// <summary>Null when the rows were saved outside any command.</summary>
        public AuditActionEnum? Action { get; set; }
        public string? ActionTitle { get; set; }

        public int ChangeCount { get; set; }
    }

    public class AuditEventDto
    {
        public long Id { get; set; }
        public DateTime OccurredAt { get; set; }
        public int? UserId { get; set; }
        public string? UserName { get; set; }
        public AuditActionEnum? Action { get; set; }
        public string? ActionTitle { get; set; }
        public List<AuditChangeDto> Changes { get; set; } = new();
    }

    public class AuditChangeDto
    {
        public long Id { get; set; }

        /// <summary>Entity class name, e.g. "SaleItem".</summary>
        public string EntityType { get; set; } = null!;

        /// <summary>Primary key as text: "42", or "5,3" for a composite key.</summary>
        public string EntityKey { get; set; } = null!;

        public AuditOperationEnum Operation { get; set; }
        public DocumentKindEnum? DocumentKind { get; set; }
        public int? DocumentId { get; set; }

        /// <summary>
        /// One entry per column: for an update only the columns that changed, for an insert or delete the whole row
        /// (with <see cref="AuditFieldChangeDto.OldValue"/> or <see cref="AuditFieldChangeDto.NewValue"/> null).
        /// </summary>
        public List<AuditFieldChangeDto> Fields { get; set; } = new();
    }

    public class AuditFieldChangeDto
    {
        /// <summary>Entity property name, e.g. "Status".</summary>
        public string Name { get; set; } = null!;

        /// <summary>The value as it was stored: a number for an enum, ISO text for a date. "***" for a secret.</summary>
        public JsonElement? OldValue { get; set; }
        public JsonElement? NewValue { get; set; }
    }
}
