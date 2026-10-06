using System.ComponentModel;

namespace Application.Common.DataTransfer
{
    /// <summary>File formats the import/export core reads and writes. The integers are a wire contract.</summary>
    public enum DataTransferFormatEnum
    {
        [Description("CSV")]
        CSV = 1,

        [Description("Excel")]
        XLSX = 2,
    }

    /// <summary>
    /// How a column's value is typed. Drives parsing on import and the cell type on export (a number stays a
    /// number in Excel, a date stays a date), so it is declared once per column and never guessed from data.
    /// </summary>
    public enum DataFieldTypeEnum
    {
        Text = 1,
        Integer = 2,
        Decimal = 3,
        Boolean = 4,
        Date = 5,

        /// <summary>An enum member; read from its Persian [Description], its name or its number.</summary>
        Enum = 6,
    }

    public enum ImportRowStatusEnum
    {
        VALID = 1,
        INVALID = 2,

        /// <summary>Matches an existing record (or an earlier row of the same file) on a duplicate key; skipped on commit.</summary>
        DUPLICATE = 3,
    }

    public enum ImportIssueSeverityEnum
    {
        ERROR = 1,
        WARNING = 2,
    }

    /// <summary>What a definition wants done with a row that matches an existing record on one of its duplicate keys.</summary>
    public enum DuplicatePolicyEnum
    {
        /// <summary>Report it and leave the existing record alone. The row is not an error.</summary>
        SKIP = 1,

        /// <summary>Report it as an error: the file is wrong, not the database.</summary>
        REJECT = 2,
    }

    public enum ImportModeEnum
    {
        /// <summary>Parse and validate only. Nothing is written.</summary>
        PREVIEW = 1,

        /// <summary>Parse, validate again (the preview is never trusted) and write the valid rows in one transaction.</summary>
        COMMIT = 2,
    }

    public enum DataTransferOperationEnum
    {
        EXPORT = 1,
        IMPORT_PREVIEW = 2,
        IMPORT_COMMIT = 3,
        IMPORT_TEMPLATE = 4,
    }
}
