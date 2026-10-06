namespace Application.Common.DataTransfer
{
    /// <summary>
    /// Safety limits for import and export, bound from the <c>DataTransfer</c> section of appsettings.json.
    /// Every limit is enforced before the expensive part of the work starts (an upload is size-checked before it is
    /// parsed, an export is counted before a byte is written).
    /// </summary>
    public class DataTransferOptions
    {
        public const string SectionName = "DataTransfer";

        /// <summary>Largest accepted import file. Must stay under RequestLimits:MaxBodyBytes, which rejects earlier.</summary>
        public long MaxUploadBytes { get; set; } = 5 * 1024 * 1024;

        /// <summary>Most data rows one import may carry (the header row not counted).</summary>
        public int MaxImportRows { get; set; } = 5000;

        /// <summary>Most rows one export may write. A larger result is refused with a message asking for a narrower filter.</summary>
        public int MaxExportRows { get; set; } = 50000;

        /// <summary>Rows staged per SaveChanges during a commit. All batches still share one transaction.</summary>
        public int ImportBatchSize { get; set; } = 200;

        /// <summary>Most uncompressed bytes an .xlsx may expand to; guards against zip bombs before the workbook is opened.</summary>
        public long MaxXlsxUncompressedBytes { get; set; } = 100 * 1024 * 1024;

        /// <summary>Most issues returned in one result. The counts stay exact; only the list is cut.</summary>
        public int MaxReportedIssues { get; set; } = 1000;

        /// <summary>Rows echoed back in a preview so the user can see what will be imported.</summary>
        public int PreviewRowCount { get; set; } = 50;
    }
}
