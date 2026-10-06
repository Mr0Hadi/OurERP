using Application.Common.DataTransfer;

namespace Application.Common.Contracts.DataTransfer
{
    /// <summary>
    /// Records who exported or imported what. There is no audit table in this codebase yet, so the implementation
    /// writes a structured log event (Infrastructure/Services/DataTransfer/DataTransferAuditLog.cs); a future audit
    /// store only has to implement this interface. The uploaded file itself is never kept.
    /// Synchronous on purpose: it only hands an event to the logger (section 3's async rule).
    /// </summary>
    public interface IDataTransferAuditLog
    {
        void Record(DataTransferAuditEntry entry);
    }

    public sealed record DataTransferAuditEntry
    {
        public int? UserId { get; init; }

        public required DataTransferOperationEnum Operation { get; init; }

        public required string Resource { get; init; }

        public DataTransferFormatEnum? Format { get; init; }

        /// <summary>Rows written to an export, or rows read from an import file.</summary>
        public int RecordCount { get; init; }

        public int ImportedCount { get; init; }

        public int InvalidCount { get; init; }

        public int DuplicateCount { get; init; }

        /// <summary>"SUCCEEDED", "REFUSED" (validation/limits) or "FAILED" (unexpected error, rolled back).</summary>
        public required string Status { get; init; }

        /// <summary>The client's file name, already reduced to a safe display form. Never the file content.</summary>
        public string? FileName { get; init; }

        public string? Detail { get; init; }

        public TimeSpan Duration { get; init; }
    }
}
