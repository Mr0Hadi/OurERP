namespace Application.Common.DataTransfer
{
    /// <summary>
    /// One column a definition accepts on import. Columns are a whitelist: a header the definition does not list
    /// is reported as a warning and ignored, so an exported file (or a file with extra notes) never writes a field
    /// that was not deliberately made importable.
    /// </summary>
    public sealed class ImportColumn
    {
        /// <summary>Stable machine key, also accepted as a header (e.g. "name").</summary>
        public required string Key { get; init; }

        /// <summary>The Persian header written into templates and exports.</summary>
        public required string Header { get; init; }

        public DataFieldTypeEnum Type { get; init; } = DataFieldTypeEnum.Text;

        public bool Required { get; init; }

        /// <summary>
        /// The command property this column fills. A FluentValidation failure on that property is reported against
        /// this column, so the user sees "row 17, column Barcode" rather than a bare property name.
        /// </summary>
        public string? Property { get; init; }

        /// <summary>Other headers that mean the same column (English names, older spellings).</summary>
        public IReadOnlyList<string> Aliases { get; init; } = Array.Empty<string>();

        public int? MaxLength { get; init; }

        /// <summary>Required for <see cref="DataFieldTypeEnum.Enum"/>.</summary>
        public Type? EnumType { get; init; }

        public decimal MinValue { get; init; } = decimal.MinValue;

        public decimal MaxValue { get; init; } = decimal.MaxValue;

        /// <summary>
        /// Text that is really digits (phone, national id, postal code): Persian digits are turned into ASCII before
        /// validation, the same way a number column is.
        /// </summary>
        public bool AsciiDigits { get; init; }

        /// <summary>One line of help printed under the header in the import template.</summary>
        public string? Hint { get; init; }
    }
}
