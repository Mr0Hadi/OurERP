using Application.Common.DataTransfer;

namespace Application.Common.Contracts.DataTransfer
{
    /// <summary>
    /// One file format (CSV, XLSX) the import/export core can read and write. Knows nothing about products,
    /// permissions or HTTP: it turns typed rows into bytes and bytes into string cells, so the same
    /// implementation serves table export today and a backup/restore package later.
    /// Implemented in Infrastructure (Infrastructure/Services/DataTransfer).
    /// </summary>
    public interface ITabularFileFormat
    {
        DataTransferFormatEnum Format { get; }

        string ContentType { get; }

        /// <summary>With the dot, e.g. ".csv".</summary>
        string Extension { get; }

        /// <summary>
        /// A writer over <paramref name="output"/>. The caller writes every row and then calls CompleteAsync;
        /// nothing guarantees the bytes are flushed before that.
        /// </summary>
        ITabularWriter CreateWriter(Stream output, IReadOnlyList<TabularColumn> columns, string sheetName);

        /// <summary>
        /// Reads the first sheet: the first non-empty row is the header, every later row is data. Fully blank
        /// rows are dropped but keep their numbering, so a reported row number is the one the user sees in
        /// Excel. Throws ValidationCustomException when the content is not really this format, is not UTF-8
        /// (CSV), or carries more than <see cref="TabularReadLimits.MaxRows"/> data rows.
        /// </summary>
        Task<TabularSheet> ReadAsync(Stream input, TabularReadLimits limits, CancellationToken cancellationToken);
    }

    public interface ITabularWriter
    {
        /// <summary>One value per column, in column order. Values are already typed (string, long, decimal, bool, DateTime or null).</summary>
        Task WriteRowAsync(IReadOnlyList<object?> values, CancellationToken cancellationToken);

        Task CompleteAsync(CancellationToken cancellationToken);
    }

    public sealed record TabularColumn(string Header, DataFieldTypeEnum Type);

    public sealed record TabularRow(int RowNumber, IReadOnlyList<string?> Cells);

    public sealed class TabularSheet
    {
        public IReadOnlyList<string> Headers { get; init; } = Array.Empty<string>();

        /// <summary>Row number (1-based, as the spreadsheet shows it) of the header row.</summary>
        public int HeaderRowNumber { get; init; } = 1;

        public IReadOnlyList<TabularRow> Rows { get; init; } = Array.Empty<TabularRow>();
    }

    public sealed class TabularReadLimits
    {
        public int MaxRows { get; init; }

        public long MaxUncompressedBytes { get; init; }
    }

    /// <summary>Picks the implementation for a format. Throws ValidationCustomException for one that is not registered.</summary>
    public interface ITabularFileFormatProvider
    {
        ITabularFileFormat Get(DataTransferFormatEnum format);
    }
}
