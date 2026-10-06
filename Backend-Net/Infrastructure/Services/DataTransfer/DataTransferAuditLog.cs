using Application.Common.Contracts.DataTransfer;
using Microsoft.Extensions.Logging;

namespace Infrastructure.Services.DataTransfer
{
    /// <summary>
    /// Import/export audit as structured log events (Serilog). Searchable by the "DataTransferAudit" message template
    /// and its properties. Failures log at Warning so they stand out from routine exports.
    /// </summary>
    public class DataTransferAuditLog : IDataTransferAuditLog
    {
        private readonly ILogger<DataTransferAuditLog> _logger;

        public DataTransferAuditLog(ILogger<DataTransferAuditLog> logger)
        {
            _logger = logger;
        }

        public void Record(DataTransferAuditEntry entry)
        {
            var level = entry.Status == "SUCCEEDED" ? LogLevel.Information : LogLevel.Warning;

            _logger.Log(level,
                "DataTransferAudit {Operation} {Resource} user={UserId} status={Status} format={Format} records={RecordCount} imported={ImportedCount} invalid={InvalidCount} duplicates={DuplicateCount} file={FileName} detail={Detail} durationMs={DurationMs}",
                entry.Operation, entry.Resource, entry.UserId, entry.Status, entry.Format, entry.RecordCount, entry.ImportedCount,
                entry.InvalidCount, entry.DuplicateCount, entry.FileName, entry.Detail, (long)entry.Duration.TotalMilliseconds);
        }
    }
}
