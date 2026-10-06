using System.Globalization;
using System.Text;
using Application.Common.Contracts.DataTransfer;
using Application.Common.DataTransfer;
using Common.Exceptions;

namespace Infrastructure.Services.DataTransfer
{
    /// <summary>
    /// RFC 4180 CSV. Written as UTF-8 with a BOM - without it Excel opens a UTF-8 file as the system code page and
    /// Persian text turns into mojibake - CRLF line endings, comma separated, every field that needs it quoted.
    /// Read strictly as UTF-8 (a BOM is optional); the separator may also be ';' or a tab, which some Excel locales
    /// write instead of a comma.
    /// </summary>
    public class CsvTabularFormat : ITabularFileFormat
    {
        private static readonly UTF8Encoding WriteEncoding = new(encoderShouldEmitUTF8Identifier: true);
        private static readonly UTF8Encoding StrictEncoding = new(encoderShouldEmitUTF8Identifier: false, throwOnInvalidBytes: true);

        public DataTransferFormatEnum Format => DataTransferFormatEnum.CSV;

        public string ContentType => "text/csv; charset=utf-8";

        public string Extension => ".csv";

        public ITabularWriter CreateWriter(Stream output, IReadOnlyList<TabularColumn> columns, string sheetName)
            => new CsvWriter(output, columns);

        public async Task<TabularSheet> ReadAsync(Stream input, TabularReadLimits limits, CancellationToken cancellationToken)
        {
            using var buffer = new MemoryStream();
            await input.CopyToAsync(buffer, cancellationToken);
            var bytes = buffer.ToArray();

            EnsureLooksLikeText(bytes);

            string text;
            try
            {
                var offset = bytes.Length >= 3 && bytes[0] == 0xEF && bytes[1] == 0xBB && bytes[2] == 0xBF ? 3 : 0;
                text = StrictEncoding.GetString(bytes, offset, bytes.Length - offset);
            }
            catch (DecoderFallbackException)
            {
                throw new ValidationCustomException("فایل CSV با UTF-8 ذخیره نشده است. در Excel گزینه‌ی «CSV UTF-8» را انتخاب کنید.");
            }

            return Parse(text, limits.MaxRows);
        }

        /// <summary>Renaming an executable, archive or PDF to .csv must not get it parsed as text.</summary>
        private static void EnsureLooksLikeText(byte[] bytes)
        {
            static bool StartsWith(byte[] data, params byte[] signature) => data.Length >= signature.Length && data.AsSpan(0, signature.Length).SequenceEqual(signature);

            if (StartsWith(bytes, 0x50, 0x4B, 0x03, 0x04) // zip (also .xlsx)
                || StartsWith(bytes, 0x4D, 0x5A)          // MZ: Windows executable
                || StartsWith(bytes, 0x7F, 0x45, 0x4C, 0x46) // ELF
                || StartsWith(bytes, 0x25, 0x50, 0x44, 0x46) // %PDF
                || StartsWith(bytes, 0xD0, 0xCF, 0x11, 0xE0) // legacy Office (.xls)
                || bytes.AsSpan(0, Math.Min(bytes.Length, 8192)).IndexOf((byte)0) >= 0)
            {
                throw new ValidationCustomException("محتوای فایل CSV نیست.");
            }
        }

        internal static TabularSheet Parse(string text, int maxRows)
        {
            var separator = DetectSeparator(text);
            var records = ReadRecords(text, separator);

            var headerIndex = records.FindIndex(r => !IsBlank(r));
            if (headerIndex < 0)
                return new TabularSheet();

            var rows = new List<TabularRow>();
            for (var i = headerIndex + 1; i < records.Count; i++)
            {
                if (IsBlank(records[i])) continue;
                if (rows.Count == maxRows)
                    throw new ValidationCustomException($"فایل بیش از {maxRows:N0} ردیف دارد. آن را به چند فایل کوچک‌تر تقسیم کنید.");
                rows.Add(new TabularRow(i + 1, records[i]));
            }

            return new TabularSheet
            {
                Headers = records[headerIndex].Select(h => h?.Trim() ?? string.Empty).ToList(),
                HeaderRowNumber = headerIndex + 1,
                Rows = rows,
            };
        }

        private static bool IsBlank(IReadOnlyList<string?> record) => record.All(string.IsNullOrWhiteSpace);

        private static char DetectSeparator(string text)
        {
            var end = text.IndexOfAny(new[] { '\r', '\n' });
            var firstLine = end < 0 ? text : text[..end];
            var commas = firstLine.Count(c => c == ',');
            var semicolons = firstLine.Count(c => c == ';');
            var tabs = firstLine.Count(c => c == '\t');
            if (tabs > commas && tabs > semicolons) return '\t';
            if (semicolons > commas) return ';';
            return ',';
        }

        /// <summary>RFC 4180: quoted fields may hold separators, doubled quotes and line breaks.</summary>
        private static List<List<string?>> ReadRecords(string text, char separator)
        {
            var records = new List<List<string?>>();
            var record = new List<string?>();
            var field = new StringBuilder();
            var inQuotes = false;
            var fieldStarted = false;

            for (var i = 0; i < text.Length; i++)
            {
                var c = text[i];

                if (inQuotes)
                {
                    if (c == '"')
                    {
                        if (i + 1 < text.Length && text[i + 1] == '"') { field.Append('"'); i++; }
                        else inQuotes = false;
                    }
                    else field.Append(c);
                    continue;
                }

                if (c == '"' && !fieldStarted) { inQuotes = true; fieldStarted = true; continue; }

                if (c == separator)
                {
                    record.Add(field.ToString());
                    field.Clear();
                    fieldStarted = false;
                    continue;
                }

                if (c == '\r' || c == '\n')
                {
                    if (c == '\r' && i + 1 < text.Length && text[i + 1] == '\n') i++;
                    record.Add(field.ToString());
                    records.Add(record);
                    record = new List<string?>();
                    field.Clear();
                    fieldStarted = false;
                    continue;
                }

                field.Append(c);
                fieldStarted = true;
            }

            if (inQuotes)
                throw new ValidationCustomException("ساختار فایل CSV خراب است: یک گیومه (\") بسته نشده است.");

            if (fieldStarted || field.Length > 0 || record.Count > 0)
            {
                record.Add(field.ToString());
                records.Add(record);
            }

            return records;
        }

        internal static string FormatValue(object? value) => value switch
        {
            null => string.Empty,
            string s => DataValues.NeutralizeFormula(s),
            bool b => b ? "بله" : "خیر",
            DateTime d => d.TimeOfDay == TimeSpan.Zero
                ? d.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture)
                : d.ToString("yyyy-MM-dd HH:mm:ss", CultureInfo.InvariantCulture),
            decimal m => m.ToString(CultureInfo.InvariantCulture),
            long l => l.ToString(CultureInfo.InvariantCulture),
            IFormattable f => f.ToString(null, CultureInfo.InvariantCulture),
            _ => DataValues.NeutralizeFormula(value.ToString() ?? string.Empty),
        };

        internal static string Escape(string field)
        {
            var needsQuotes = field.IndexOfAny(new[] { ',', '"', '\r', '\n', ';', '\t' }) >= 0
                              || (field.Length > 0 && (char.IsWhiteSpace(field[0]) || char.IsWhiteSpace(field[^1])));
            return needsQuotes ? "\"" + field.Replace("\"", "\"\"") + "\"" : field;
        }

        private sealed class CsvWriter : ITabularWriter
        {
            private readonly StreamWriter _writer;
            private readonly IReadOnlyList<TabularColumn> _columns;
            private bool _headerWritten;

            public CsvWriter(Stream output, IReadOnlyList<TabularColumn> columns)
            {
                _writer = new StreamWriter(output, WriteEncoding, bufferSize: 64 * 1024, leaveOpen: true) { NewLine = "\r\n" };
                _columns = columns;
            }

            public async Task WriteRowAsync(IReadOnlyList<object?> values, CancellationToken cancellationToken)
            {
                await EnsureHeaderAsync(cancellationToken);
                await WriteLineAsync(values.Select(v => Escape(FormatValue(v))), cancellationToken);
            }

            public async Task CompleteAsync(CancellationToken cancellationToken)
            {
                await EnsureHeaderAsync(cancellationToken);
                await _writer.FlushAsync(cancellationToken);
                await _writer.DisposeAsync();
            }

            private async Task EnsureHeaderAsync(CancellationToken cancellationToken)
            {
                if (_headerWritten) return;
                _headerWritten = true;
                await WriteLineAsync(_columns.Select(c => Escape(DataValues.NeutralizeFormula(c.Header))), cancellationToken);
            }

            private async Task WriteLineAsync(IEnumerable<string> fields, CancellationToken cancellationToken)
            {
                await _writer.WriteAsync(string.Join(',', fields).AsMemory(), cancellationToken);
                await _writer.WriteAsync(_writer.NewLine.AsMemory(), cancellationToken);
            }
        }
    }
}
