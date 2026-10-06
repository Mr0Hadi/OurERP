using System.Globalization;
using System.IO.Compression;
using Application.Common.Contracts.DataTransfer;
using Application.Common.DataTransfer;
using ClosedXML.Excel;
using Common.Exceptions;

namespace Infrastructure.Services.DataTransfer
{
    /// <summary>
    /// .xlsx through ClosedXML (already used for the invoice template). Cells keep their type: numbers are numbers,
    /// dates are dates, booleans are booleans, and text is written as a text value - never as a formula - so a value
    /// starting with "=" is shown, not evaluated. The sheet is right-to-left with a bold, frozen header.
    ///
    /// ClosedXML holds the workbook in memory, which is why exports are capped (DataTransfer:MaxExportRows). If that
    /// cap ever has to grow far, swap this writer for an OpenXmlWriter (SAX) one behind the same interface.
    /// </summary>
    public class XlsxTabularFormat : ITabularFileFormat
    {
        private const string DateFormat = "yyyy-mm-dd";
        private const string DateTimeFormat = "yyyy-mm-dd hh:mm";

        public DataTransferFormatEnum Format => DataTransferFormatEnum.XLSX;

        public string ContentType => "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

        public string Extension => ".xlsx";

        public ITabularWriter CreateWriter(Stream output, IReadOnlyList<TabularColumn> columns, string sheetName)
            => new XlsxWriter(output, columns, sheetName);

        public async Task<TabularSheet> ReadAsync(Stream input, TabularReadLimits limits, CancellationToken cancellationToken)
        {
            var buffer = new MemoryStream();
            await input.CopyToAsync(buffer, cancellationToken);

            EnsureRealWorkbook(buffer, limits.MaxUncompressedBytes);
            buffer.Position = 0;

            XLWorkbook workbook;
            try
            {
                workbook = new XLWorkbook(buffer);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                throw new ValidationCustomException("فایل Excel سالم نیست یا قابل خواندن نیست.");
            }

            using (workbook)
            {
                var sheet = workbook.Worksheets.FirstOrDefault();
                return sheet == null ? new TabularSheet() : ReadSheet(sheet, limits.MaxRows);
            }
        }

        /// <summary>
        /// An .xlsx is a zip with a known layout. Checking the signature and the parts before ClosedXML sees the file
        /// stops a renamed executable or archive, and summing the declared uncompressed sizes stops a zip bomb from
        /// being inflated in memory.
        /// </summary>
        private static void EnsureRealWorkbook(MemoryStream buffer, long maxUncompressedBytes)
        {
            var bytes = buffer.GetBuffer();
            if (buffer.Length < 4 || bytes[0] != 0x50 || bytes[1] != 0x4B || bytes[2] != 0x03 || bytes[3] != 0x04)
                throw new ValidationCustomException("محتوای فایل Excel (.xlsx) نیست.");

            buffer.Position = 0;
            try
            {
                using var zip = new ZipArchive(buffer, ZipArchiveMode.Read, leaveOpen: true);
                var names = zip.Entries.Select(e => e.FullName).ToHashSet(StringComparer.OrdinalIgnoreCase);

                if (!names.Contains("[Content_Types].xml") || !names.Contains("xl/workbook.xml"))
                    throw new ValidationCustomException("محتوای فایل Excel (.xlsx) نیست.");

                if (names.Contains("xl/vbaProject.bin"))
                    throw new ValidationCustomException("فایل Excel ماکرو دارد و پذیرفته نمی‌شود.");

                if (zip.Entries.Sum(e => e.Length) > maxUncompressedBytes)
                    throw new ValidationCustomException("فایل Excel بیش از حد بزرگ است.");
            }
            catch (InvalidDataException)
            {
                throw new ValidationCustomException("فایل Excel سالم نیست یا قابل خواندن نیست.");
            }
        }

        private static TabularSheet ReadSheet(IXLWorksheet sheet, int maxRows)
        {
            var usedRows = sheet.RowsUsed(XLCellsUsedOptions.Contents).ToList();
            var header = usedRows.FirstOrDefault(r => !r.IsEmpty(XLCellsUsedOptions.Contents));
            if (header == null) return new TabularSheet();

            var lastColumn = header.LastCellUsed(XLCellsUsedOptions.Contents)?.Address.ColumnNumber ?? 0;
            var headers = Enumerable.Range(1, lastColumn).Select(c => ReadCell(header.Cell(c)) ?? string.Empty).ToList();

            var rows = new List<TabularRow>();
            foreach (var row in usedRows.Where(r => r.RowNumber() > header.RowNumber()))
            {
                var cells = Enumerable.Range(1, lastColumn).Select(c => ReadCell(row.Cell(c))).ToList();
                if (cells.All(string.IsNullOrWhiteSpace)) continue;

                if (rows.Count == maxRows)
                    throw new ValidationCustomException($"فایل بیش از {maxRows:N0} ردیف دارد. آن را به چند فایل کوچک‌تر تقسیم کنید.");

                rows.Add(new TabularRow(row.RowNumber(), cells));
            }

            return new TabularSheet { Headers = headers, HeaderRowNumber = header.RowNumber(), Rows = rows };
        }

        private static string? ReadCell(IXLCell cell)
        {
            // A formula's value depends on whatever last calculated the file; refuse it rather than guess.
            if (cell.HasFormula)
                throw new ValidationCustomException($"خانه‌ی {cell.Address} فرمول دارد. فایل را با «مقدار» به‌جای فرمول ذخیره کنید.");

            var value = cell.Value;
            return value.Type switch
            {
                XLDataType.Blank => null,
                XLDataType.Text => value.GetText(),
                XLDataType.Boolean => value.GetBoolean() ? "true" : "false",
                XLDataType.Number => ((decimal)value.GetNumber()).ToString(CultureInfo.InvariantCulture),
                XLDataType.DateTime => value.GetDateTime() is var d && d.TimeOfDay == TimeSpan.Zero
                    ? d.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture)
                    : value.GetDateTime().ToString("yyyy-MM-dd HH:mm:ss", CultureInfo.InvariantCulture),
                XLDataType.TimeSpan => value.GetTimeSpan().ToString(),
                _ => cell.GetFormattedString(),
            };
        }

        /// <summary>Excel sheet names: at most 31 characters, none of : \ / ? * [ ].</summary>
        private static string SafeSheetName(string name)
        {
            var cleaned = new string(name.Where(c => ":\\/?*[]".IndexOf(c) < 0).ToArray()).Trim();
            if (cleaned.Length == 0) cleaned = "Sheet1";
            return cleaned.Length > 31 ? cleaned[..31] : cleaned;
        }

        private sealed class XlsxWriter : ITabularWriter
        {
            private readonly Stream _output;
            private readonly IReadOnlyList<TabularColumn> _columns;
            private readonly XLWorkbook _workbook = new();
            private readonly IXLWorksheet _sheet;
            private int _row = 1;

            public XlsxWriter(Stream output, IReadOnlyList<TabularColumn> columns, string sheetName)
            {
                _output = output;
                _columns = columns;
                _sheet = _workbook.Worksheets.Add(SafeSheetName(sheetName));
                _sheet.RightToLeft = true;

                for (var c = 0; c < columns.Count; c++)
                {
                    var cell = _sheet.Cell(1, c + 1);
                    cell.SetValue(columns[c].Header);
                    cell.Style.Font.Bold = true;
                    cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#EEF2F7");

                    // Text columns are formatted as text so a value typed later (a phone number starting with 0)
                    // is not turned into a number by Excel.
                    var column = _sheet.Column(c + 1);
                    column.Width = Math.Clamp(columns[c].Header.Length + 6, 12, 40);
                    column.Style.NumberFormat.Format = columns[c].Type switch
                    {
                        DataFieldTypeEnum.Text or DataFieldTypeEnum.Enum => "@",
                        DataFieldTypeEnum.Integer => "#,##0",
                        DataFieldTypeEnum.Decimal => "#,##0.####",
                        _ => column.Style.NumberFormat.Format,
                    };
                }

                _sheet.SheetView.FreezeRows(1);
            }

            public Task WriteRowAsync(IReadOnlyList<object?> values, CancellationToken cancellationToken)
            {
                cancellationToken.ThrowIfCancellationRequested();
                _row++;
                for (var c = 0; c < values.Count && c < _columns.Count; c++)
                {
                    var cell = _sheet.Cell(_row, c + 1);
                    switch (values[c])
                    {
                        case null:
                            break;
                        case string text:
                            // A text value, not a formula: ClosedXML only creates formulas through FormulaA1.
                            cell.SetValue(text);
                            break;
                        case long number:
                            cell.SetValue(number);
                            break;
                        case decimal number:
                            cell.SetValue(number);
                            break;
                        case bool flag:
                            cell.SetValue(flag);
                            break;
                        case DateTime date:
                            cell.SetValue(date);
                            cell.Style.NumberFormat.Format = date.TimeOfDay == TimeSpan.Zero ? DateFormat : DateTimeFormat;
                            break;
                        default:
                            cell.SetValue(values[c]!.ToString());
                            break;
                    }
                }
                return Task.CompletedTask;
            }

            public async Task CompleteAsync(CancellationToken cancellationToken)
            {
                if (_columns.Count > 0)
                    _sheet.Range(1, 1, Math.Max(_row, 1), _columns.Count).SetAutoFilter();

                // ClosedXML writes synchronously and ASP.NET forbids synchronous writes to the response body,
                // so the package is built in memory and copied out asynchronously.
                using var buffer = new MemoryStream();
                _workbook.SaveAs(buffer);
                _workbook.Dispose();
                buffer.Position = 0;
                await buffer.CopyToAsync(_output, cancellationToken);
            }
        }
    }
}
