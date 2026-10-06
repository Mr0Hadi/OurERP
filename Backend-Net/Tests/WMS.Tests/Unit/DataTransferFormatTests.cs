using System.IO.Compression;
using System.Text;
using Application.Common.Contracts.DataTransfer;
using Application.Common.DataTransfer;
using ClosedXML.Excel;
using Common.Exceptions;
using Infrastructure.Services.DataTransfer;

namespace WMS.Tests.Unit
{
    /// <summary>The two file formats on their own: what they write, what they accept and what they refuse.</summary>
    public class DataTransferFormatTests
    {
        private static readonly TabularReadLimits Limits = new() { MaxRows = 100, MaxUncompressedBytes = 50 * 1024 * 1024 };

        private static readonly IReadOnlyList<TabularColumn> Columns = new[]
        {
            new TabularColumn("نام", DataFieldTypeEnum.Text),
            new TabularColumn("قیمت", DataFieldTypeEnum.Integer),
            new TabularColumn("تاریخ", DataFieldTypeEnum.Date),
            new TabularColumn("فعال", DataFieldTypeEnum.Boolean),
        };

        private static async Task<byte[]> WriteAsync(ITabularFileFormat format, params object?[][] rows)
        {
            using var output = new MemoryStream();
            var writer = format.CreateWriter(output, Columns, "کالاها");
            foreach (var row in rows)
                await writer.WriteRowAsync(row, CancellationToken.None);
            await writer.CompleteAsync(CancellationToken.None);
            return output.ToArray();
        }

        private static Task<TabularSheet> ReadAsync(ITabularFileFormat format, byte[] bytes, TabularReadLimits? limits = null)
            => format.ReadAsync(new MemoryStream(bytes), limits ?? Limits, CancellationToken.None);

        // ---------------- CSV ----------------

        [Fact]
        public async Task Csv_StartsWithUtf8Bom_SoExcelReadsPersian()
        {
            var bytes = await WriteAsync(new CsvTabularFormat(), new object?[] { "لوازم یدکی", 1500L, null, true });

            Assert.Equal(new byte[] { 0xEF, 0xBB, 0xBF }, bytes[..3]);
            Assert.Contains("لوازم یدکی", Encoding.UTF8.GetString(bytes));
        }

        [Fact]
        public async Task Csv_QuotesCommasQuotesAndNewlines_AndRoundTrips()
        {
            var tricky = "شرکت \"آلفا\", شعبه ۲\nخط دوم";
            var format = new CsvTabularFormat();

            var bytes = await WriteAsync(format, new object?[] { tricky, 1234567L, new DateTime(2024, 8, 2), false });
            var text = Encoding.UTF8.GetString(bytes[3..]);

            Assert.Contains("\"شرکت \"\"آلفا\"\", شعبه ۲\nخط دوم\"", text);
            Assert.Contains("1234567", text);
            Assert.Contains("2024-08-02", text);
            Assert.Contains("خیر", text);

            var sheet = await ReadAsync(format, bytes);
            Assert.Equal(new[] { "نام", "قیمت", "تاریخ", "فعال" }, sheet.Headers);
            Assert.Single(sheet.Rows);
            Assert.Equal(tricky, sheet.Rows[0].Cells[0]);
            Assert.Equal(2, sheet.Rows[0].RowNumber);
        }

        [Theory]
        [InlineData("=HYPERLINK(\"http://x\")")]
        [InlineData("+98912")]
        [InlineData("-2+3")]
        [InlineData("@SUM(A1)")]
        public async Task Csv_NeutralizesFormulaLikeText(string value)
        {
            var bytes = await WriteAsync(new CsvTabularFormat(), new object?[] { value, null, null, null });
            var text = Encoding.UTF8.GetString(bytes[3..]);

            Assert.DoesNotContain("\n" + value, text.Replace("\r\n", "\n"));
            Assert.Contains("'" + value.Replace("\"", "\"\""), text);
        }

        [Fact]
        public async Task Csv_NegativeNumber_IsNotTreatedAsAFormula()
        {
            var bytes = await WriteAsync(new CsvTabularFormat(), new object?[] { "x", -5L, null, null });
            Assert.Contains(",-5,", Encoding.UTF8.GetString(bytes));
        }

        [Fact]
        public async Task Csv_EmptyDataset_WritesTheHeaderOnly()
        {
            var bytes = await WriteAsync(new CsvTabularFormat());
            var text = Encoding.UTF8.GetString(bytes[3..]);

            Assert.Equal("نام,قیمت,تاریخ,فعال\r\n", text);
        }

        [Fact]
        public async Task Csv_SkipsBlankRows_ButKeepsTheirNumbering()
        {
            var bytes = Encoding.UTF8.GetBytes("نام,قیمت\r\nالف,1\r\n,\r\n\r\nب,2\r\n");
            var sheet = await ReadAsync(new CsvTabularFormat(), bytes);

            Assert.Equal(new[] { 2, 5 }, sheet.Rows.Select(r => r.RowNumber));
        }

        [Fact]
        public async Task Csv_AcceptsSemicolonSeparatedFiles()
        {
            var sheet = await ReadAsync(new CsvTabularFormat(), Encoding.UTF8.GetBytes("نام;قیمت\nالف;1500\n"));

            Assert.Equal(new[] { "نام", "قیمت" }, sheet.Headers);
            Assert.Equal("1500", sheet.Rows[0].Cells[1]);
        }

        [Fact]
        public async Task Csv_RefusesFileThatIsNotUtf8()
        {
            // "سلام" in Windows-1256.
            var bytes = new byte[] { 0x6E, 0x61, 0x6D, 0x65, 0x0A, 0xD3, 0xE1, 0xC7, 0xE3, 0x0A };
            await Assert.ThrowsAsync<ValidationCustomException>(() => ReadAsync(new CsvTabularFormat(), bytes));
        }

        [Theory]
        [InlineData(new byte[] { 0x4D, 0x5A, 0x90, 0x00 })]            // renamed .exe
        [InlineData(new byte[] { 0x50, 0x4B, 0x03, 0x04 })]            // zip / xlsx
        [InlineData(new byte[] { 0x25, 0x50, 0x44, 0x46, 0x2D })]      // PDF
        [InlineData(new byte[] { 0x61, 0x00, 0x62 })]                  // binary with NUL
        public async Task Csv_RefusesBinaryContent(byte[] bytes)
        {
            await Assert.ThrowsAsync<ValidationCustomException>(() => ReadAsync(new CsvTabularFormat(), bytes));
        }

        [Fact]
        public async Task Csv_RefusesMoreRowsThanTheLimit()
        {
            var text = "نام\n" + string.Join("\n", Enumerable.Range(1, 4).Select(i => $"r{i}"));
            await Assert.ThrowsAsync<ValidationCustomException>(() =>
                ReadAsync(new CsvTabularFormat(), Encoding.UTF8.GetBytes(text), new TabularReadLimits { MaxRows = 3, MaxUncompressedBytes = 1 }));
        }

        [Fact]
        public async Task Csv_RefusesAnUnclosedQuote()
        {
            await Assert.ThrowsAsync<ValidationCustomException>(() => ReadAsync(new CsvTabularFormat(), Encoding.UTF8.GetBytes("a\n\"broken")));
        }

        // ---------------- XLSX ----------------

        [Fact]
        public async Task Xlsx_KeepsTypes_PersianText_AndRightToLeft()
        {
            var bytes = await WriteAsync(new XlsxTabularFormat(), new object?[] { "لوازم یدکی", 1500L, new DateTime(2024, 8, 2), true });

            using var workbook = new XLWorkbook(new MemoryStream(bytes));
            var sheet = workbook.Worksheet(1);

            Assert.True(sheet.RightToLeft);
            Assert.Equal("کالاها", sheet.Name);
            Assert.Equal("نام", sheet.Cell(1, 1).GetString());
            Assert.True(sheet.Cell(1, 1).Style.Font.Bold);
            Assert.Equal("لوازم یدکی", sheet.Cell(2, 1).GetString());
            Assert.Equal(XLDataType.Number, sheet.Cell(2, 2).DataType);
            Assert.Equal(1500d, sheet.Cell(2, 2).GetDouble());
            Assert.Equal(XLDataType.DateTime, sheet.Cell(2, 3).DataType);
            Assert.Equal(new DateTime(2024, 8, 2), sheet.Cell(2, 3).GetDateTime());
            Assert.Equal(XLDataType.Boolean, sheet.Cell(2, 4).DataType);
        }

        [Fact]
        public async Task Xlsx_FormulaLikeText_IsStoredAsText_NotAFormula()
        {
            var bytes = await WriteAsync(new XlsxTabularFormat(), new object?[] { "=1+1", null, null, null });

            using var workbook = new XLWorkbook(new MemoryStream(bytes));
            var cell = workbook.Worksheet(1).Cell(2, 1);

            Assert.False(cell.HasFormula);
            Assert.Equal(XLDataType.Text, cell.DataType);
            Assert.Equal("=1+1", cell.GetString());
        }

        [Fact]
        public async Task Xlsx_RoundTripsThroughTheReader()
        {
            var format = new XlsxTabularFormat();
            var bytes = await WriteAsync(format,
                new object?[] { "الف", 1500L, new DateTime(2024, 8, 2), true },
                new object?[] { "ب", null, null, false });

            var sheet = await ReadAsync(format, bytes);

            Assert.Equal(new[] { "نام", "قیمت", "تاریخ", "فعال" }, sheet.Headers);
            Assert.Equal(2, sheet.Rows.Count);
            Assert.Equal(new string?[] { "الف", "1500", "2024-08-02", "true" }, sheet.Rows[0].Cells);
            Assert.Null(sheet.Rows[1].Cells[1]);
            Assert.Equal(3, sheet.Rows[1].RowNumber);
        }

        [Fact]
        public async Task Xlsx_EmptyDataset_IsAHeaderOnlySheet()
        {
            var sheet = await ReadAsync(new XlsxTabularFormat(), await WriteAsync(new XlsxTabularFormat()));

            Assert.Equal(4, sheet.Headers.Count);
            Assert.Empty(sheet.Rows);
        }

        [Fact]
        public async Task Xlsx_RefusesARenamedExecutable()
        {
            var bytes = new byte[] { 0x4D, 0x5A, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00 };
            var ex = await Assert.ThrowsAsync<ValidationCustomException>(() => ReadAsync(new XlsxTabularFormat(), bytes));
            Assert.Contains("xlsx", ex.Error);
        }

        [Fact]
        public async Task Xlsx_RefusesAZipThatIsNotAWorkbook()
        {
            using var buffer = new MemoryStream();
            using (var zip = new ZipArchive(buffer, ZipArchiveMode.Create, leaveOpen: true))
            {
                using var entry = new StreamWriter(zip.CreateEntry("readme.txt").Open());
                entry.Write("not a workbook");
            }

            await Assert.ThrowsAsync<ValidationCustomException>(() => ReadAsync(new XlsxTabularFormat(), buffer.ToArray()));
        }

        [Fact]
        public async Task Xlsx_RefusesCellsWithFormulas()
        {
            using var workbook = new XLWorkbook();
            var sheet = workbook.Worksheets.Add("s");
            sheet.Cell(1, 1).Value = "نام";
            sheet.Cell(2, 1).FormulaA1 = "1+1";
            using var buffer = new MemoryStream();
            workbook.SaveAs(buffer);

            var ex = await Assert.ThrowsAsync<ValidationCustomException>(() => ReadAsync(new XlsxTabularFormat(), buffer.ToArray()));
            Assert.Contains("A2", ex.Error);
        }

        [Fact]
        public async Task Xlsx_RefusesMoreRowsThanTheLimit()
        {
            var bytes = await WriteAsync(new XlsxTabularFormat(),
                new object?[] { "1", null, null, null }, new object?[] { "2", null, null, null }, new object?[] { "3", null, null, null });

            await Assert.ThrowsAsync<ValidationCustomException>(() =>
                ReadAsync(new XlsxTabularFormat(), bytes, new TabularReadLimits { MaxRows = 2, MaxUncompressedBytes = 50 * 1024 * 1024 }));
        }

        [Fact]
        public async Task Xlsx_RefusesAZipBomb()
        {
            var bytes = await WriteAsync(new XlsxTabularFormat(), new object?[] { "1", null, null, null });

            await Assert.ThrowsAsync<ValidationCustomException>(() =>
                ReadAsync(new XlsxTabularFormat(), bytes, new TabularReadLimits { MaxRows = 10, MaxUncompressedBytes = 100 }));
        }

        [Fact]
        public void Provider_RefusesAnUnknownFormat()
        {
            var provider = new TabularFileFormatProvider(new ITabularFileFormat[] { new CsvTabularFormat() });

            Assert.IsType<CsvTabularFormat>(provider.Get(DataTransferFormatEnum.CSV));
            Assert.Throws<ValidationCustomException>(() => provider.Get(DataTransferFormatEnum.XLSX));
        }
    }
}
