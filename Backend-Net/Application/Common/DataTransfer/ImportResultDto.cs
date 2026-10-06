namespace Application.Common.DataTransfer
{
    /// <summary>
    /// The reusable result of an import run, preview or commit. The counts are always exact; <see cref="Issues"/> and
    /// <see cref="PreviewRows"/> are cut to configured limits so a 5000-row file with an error on every row does not
    /// produce a multi-megabyte response.
    /// </summary>
    public class ImportResultDto
    {
        public string Resource { get; set; } = string.Empty;

        public ImportModeEnum Mode { get; set; }

        /// <summary>True only after a commit actually wrote the rows.</summary>
        public bool Committed { get; set; }

        public int TotalRows { get; set; }

        public int ValidRows { get; set; }

        public int InvalidRows { get; set; }

        public int DuplicateRows { get; set; }

        /// <summary>Rows written. Zero for a preview.</summary>
        public int ImportedRows { get; set; }

        /// <summary>Rows that are (or, in a preview, would be) left out: invalid plus duplicate.</summary>
        public int SkippedRows { get; set; }

        public int ErrorCount { get; set; }

        public int WarningCount { get; set; }

        public bool IssuesTruncated { get; set; }

        public List<ImportColumnDto> Columns { get; set; } = new();

        public List<ImportIssueDto> Issues { get; set; } = new();

        public List<ImportPreviewRowDto> PreviewRows { get; set; } = new();
    }

    public class ImportColumnDto
    {
        public string Key { get; set; } = string.Empty;

        public string Header { get; set; } = string.Empty;

        public bool Required { get; set; }

        /// <summary>False when the file has no such column (an optional column may be left out).</summary>
        public bool Present { get; set; }
    }

    public class ImportIssueDto
    {
        /// <summary>The row number as the spreadsheet shows it (header is usually row 1, so data starts at 2).</summary>
        public int RowNumber { get; set; }

        /// <summary>The column's header as written in the file, or the expected header when it is missing.</summary>
        public string? Column { get; set; }

        public string? Value { get; set; }

        public string Message { get; set; } = string.Empty;

        /// <summary>One of <see cref="ImportErrorCodes"/>; stable, for the frontend to switch on.</summary>
        public string ErrorCode { get; set; } = string.Empty;

        public ImportIssueSeverityEnum Severity { get; set; } = ImportIssueSeverityEnum.ERROR;
    }

    public class ImportPreviewRowDto
    {
        public int RowNumber { get; set; }

        public ImportRowStatusEnum Status { get; set; }

        /// <summary>Cell text by column key, as read from the file.</summary>
        public Dictionary<string, string?> Values { get; set; } = new();
    }

    public static class ImportErrorCodes
    {
        public const string EmptyFile = "EMPTY_FILE";
        public const string MissingColumn = "MISSING_COLUMN";
        public const string DuplicateColumn = "DUPLICATE_COLUMN";
        public const string UnknownColumn = "UNKNOWN_COLUMN";
        public const string Required = "REQUIRED";
        public const string InvalidValue = "INVALID_VALUE";
        public const string ReferenceNotFound = "REFERENCE_NOT_FOUND";
        public const string ReferenceWillBeCreated = "REFERENCE_WILL_BE_CREATED";
        public const string Validation = "VALIDATION";
        public const string DuplicateInFile = "DUPLICATE_IN_FILE";
        public const string DuplicateExists = "DUPLICATE_EXISTS";
        public const string InvalidRow = "INVALID_ROW";
    }
}
