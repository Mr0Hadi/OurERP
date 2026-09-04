using System.Diagnostics;
using System.Reflection;
using Application.Common.Contracts.Documents;
using ClosedXML.Excel;
using Common.Exceptions;
using Common.Extensions;
using Microsoft.Extensions.Options;

namespace Infrastructure.Services
{
    /// <summary>
    /// Renders the official invoice/credit-note document by filling the government-style Excel
    /// template (Assets/Templates/OfficialInvoiceTemplate.xlsx) and converting it to PDF via
    /// LibreOffice headless. Chosen over the Ank.DocToolkit NuGet package after investigation: that
    /// package's own docs disclose that its XLSX-to-PDF renderer silently drops formatting it can't
    /// represent and don't document RTL/merged-cell fidelity, both of which this template leans on
    /// heavily (140+ merged ranges, entirely RTL Persian). LibreOffice uses the same layout engine
    /// a human opening the file would see, at the cost of requiring `soffice` on the deploy target
    /// (see LibreOfficeOptions).
    ///
    /// Barcode/QR label-sheet rendering is unrelated to this template and stays on QuestPDF -
    /// delegated to the injected QuestPdfDocumentService rather than duplicated here.
    /// </summary>
    public class ExcelInvoiceDocumentService : IPdfDocumentService
    {
        // The template's line-item grid (rows 21-27) has exactly 7 fixed rows; an invoice with
        // more lines gets one cloned worksheet per additional page of up to this many lines, with
        // totals/signatures printed on the last page only.
        private const int LinesPerPage = 7;
        private const string TemplateSheetName = "جدیدتر";
        private const string TemplateResourceSuffix = "Assets.Templates.OfficialInvoiceTemplate.xlsx";
        private const int FirstItemRow = 21;

        private static readonly object TemplateLock = new();
        private static byte[]? _templateBytes;

        private readonly QuestPdfDocumentService _questPdfDocumentService;
        private readonly LibreOfficeOptions _options;

        public ExcelInvoiceDocumentService(QuestPdfDocumentService questPdfDocumentService, IOptions<LibreOfficeOptions> options)
        {
            _questPdfDocumentService = questPdfDocumentService;
            _options = options.Value;
        }

        private static byte[] GetTemplateBytes()
        {
            if (_templateBytes != null)
                return _templateBytes;

            lock (TemplateLock)
            {
                if (_templateBytes != null)
                    return _templateBytes;

                var assembly = Assembly.GetExecutingAssembly();
                var resourceName = assembly.GetManifestResourceNames()
                    .FirstOrDefault(x => x.EndsWith(TemplateResourceSuffix, StringComparison.OrdinalIgnoreCase))
                        ?? throw new InvalidOperationException("قالب رسمی فاکتور در اسمبلی یافت نشد.");

                using var stream = assembly.GetManifestResourceStream(resourceName)!;
                using var buffer = new MemoryStream();
                stream.CopyTo(buffer);
                _templateBytes = buffer.ToArray();

                return _templateBytes;
            }
        }

        public async Task<byte[]> RenderInvoiceAsync(InvoiceDocumentModel model, CancellationToken cancellationToken = default)
        {
            using var workbook = BuildWorkbook(model);

            var tempDirectory = Path.Combine(Path.GetTempPath(), "wms-invoice-" + Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(tempDirectory);
            var xlsxPath = Path.Combine(tempDirectory, "invoice.xlsx");
            var pdfPath = Path.Combine(tempDirectory, "invoice.pdf");

            try
            {
                workbook.SaveAs(xlsxPath);
                await ConvertToPdfAsync(xlsxPath, tempDirectory, cancellationToken);

                if (!File.Exists(pdfPath))
                    throw new ServiceUnavailableCustomException("تبدیل فاکتور به PDF ناموفق بود.");

                return await File.ReadAllBytesAsync(pdfPath, cancellationToken);
            }
            finally
            {
                try { Directory.Delete(tempDirectory, recursive: true); } catch { /* best-effort cleanup */ }
            }
        }

        private async Task ConvertToPdfAsync(string xlsxPath, string outDirectory, CancellationToken cancellationToken)
        {
            var startInfo = new ProcessStartInfo
            {
                FileName = _options.ExecutablePath,
                ArgumentList = { "--headless", "--convert-to", "pdf", "--outdir", outDirectory, xlsxPath },
                UseShellExecute = false,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
            };

            using var timeoutCts = new CancellationTokenSource(TimeSpan.FromSeconds(_options.ConversionTimeoutSeconds));
            using var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken, timeoutCts.Token);

            Process process;
            try
            {
                process = Process.Start(startInfo)
                    ?? throw new ServiceUnavailableCustomException("امکان اجرای LibreOffice برای تبدیل فاکتور به PDF وجود ندارد.");
            }
            catch (Exception ex) when (ex is not ServiceUnavailableCustomException)
            {
                throw new ServiceUnavailableCustomException("امکان اجرای LibreOffice برای تبدیل فاکتور به PDF وجود ندارد.");
            }

            using (process)
            {
                try
                {
                    await process.WaitForExitAsync(linkedCts.Token);
                }
                catch (OperationCanceledException) when (timeoutCts.IsCancellationRequested)
                {
                    try { process.Kill(entireProcessTree: true); } catch { /* already exiting */ }
                    throw new ServiceUnavailableCustomException("تبدیل فاکتور به PDF بیش از حد مجاز طول کشید.");
                }

                if (process.ExitCode != 0)
                    throw new ServiceUnavailableCustomException("تبدیل فاکتور به PDF با خطا مواجه شد.");
            }
        }

        private static XLWorkbook BuildWorkbook(InvoiceDocumentModel model)
        {
            // Not `using` - XLWorkbook reads lazily from this stream, including during the later
            // SaveAs call the caller makes after this method returns, so it must outlive this
            // method. It's a MemoryStream (no unmanaged handle), so leaving it for the GC is safe.
            var templateStream = new MemoryStream(GetTemplateBytes());
            var workbook = new XLWorkbook(templateStream);
            var templateSheet = workbook.Worksheet(TemplateSheetName);

            var pages = Chunk(model.Lines, LinesPerPage);
            if (pages.Count == 0)
                pages.Add(new List<InvoiceLineModel>());

            var sheets = new List<IXLWorksheet> { templateSheet };
            for (var i = 1; i < pages.Count; i++)
                sheets.Add(templateSheet.CopyTo($"{TemplateSheetName} ({i + 1})"));

            for (var i = 0; i < sheets.Count; i++)
                FillPage(sheets[i], model, pages[i], isLastPage: i == sheets.Count - 1);

            return workbook;
        }

        private static void FillPage(IXLWorksheet ws, InvoiceDocumentModel model, List<InvoiceLineModel> lines, bool isLastPage)
        {
            SetValue(ws, "B1", model.Title);
            AppendValue(ws, "AX1", model.DocumentNumber.ToPersianDigits());
            AppendValue(ws, "AX3", PersianDate.ToDisplayString(model.DocumentDate).ToPersianDigits());

            // Seller box always carries our own company - matches the QuestPDF implementation this
            // replaces, which also always put Company in the seller position regardless of
            // document type (a purchase invoice still shows our company as issuer).
            SetValue(ws, "K7", model.Company.Name);
            AppendValue(ws, "AC7", model.Company.EconomicCode?.ToPersianDigits());
            AppendValue(ws, "AU7", model.Company.RegistrationNumber?.ToPersianDigits());
            SetValue(ws, "I9", model.Company.Province);
            SetValue(ws, "U9", model.Company.City);
            AppendValue(ws, "AB9", model.Company.PostalCode?.ToPersianDigits());
            AppendValue(ws, "AU9", model.Company.NationalId?.ToPersianDigits());
            SetValue(ws, "E11", model.Company.Address);
            SetValue(ws, "AY11", model.Company.PhoneNumber?.ToPersianDigits());

            SetValue(ws, "B12", "مشخصات " + model.CounterpartyLabel);
            SetValue(ws, "K14", model.Counterparty.Name);
            AppendValue(ws, "AC14", model.Counterparty.EconomicCode?.ToPersianDigits());
            AppendValue(ws, "AU14", model.Counterparty.RegistrationNumber?.ToPersianDigits());
            SetValue(ws, "I16", model.Counterparty.Province);
            SetValue(ws, "U16", model.Counterparty.City);
            AppendValue(ws, "AB16", model.Counterparty.PostalCode?.ToPersianDigits());
            AppendValue(ws, "AU16", model.Counterparty.NationalId?.ToPersianDigits());
            SetValue(ws, "E18", model.Counterparty.Address);
            SetValue(ws, "AY18", model.Counterparty.PhoneNumber?.ToPersianDigits());

            for (var i = 0; i < lines.Count && i < LinesPerPage; i++)
            {
                var row = FirstItemRow + i;
                var line = lines[i];
                ws.Cell($"B{row}").Value = line.RowNumber.ToString().ToPersianDigits();
                ws.Cell($"D{row}").Value = line.ProductCode;
                ws.Cell($"G{row}").Value = line.ProductName;
                ws.Cell($"T{row}").Value = line.Quantity.ToString().ToPersianDigits();
                ws.Cell($"W{row}").Value = "عدد";
                ws.Cell($"Z{row}").Value = Money(line.UnitPrice);
                ws.Cell($"AE{row}").Value = Money((ulong)line.Quantity * line.UnitPrice);
                ws.Cell($"AL{row}").Value = Money(line.DiscountAmount);
                ws.Cell($"AQ{row}").Value = Money((ulong)line.Quantity * line.UnitPrice - line.DiscountAmount);
                ws.Cell($"AX{row}").Value = Money(line.TaxAmount);
                ws.Cell($"BC{row}").Value = Money(line.LineTotal);
            }

            // The template pre-fills rows 21-27's row-number column with static 1-7 - clear the
            // rows past this page's actual line count so a short last page doesn't show a bare
            // row number with nothing else in the row.
            for (var i = lines.Count; i < LinesPerPage; i++)
                ws.Cell($"B{FirstItemRow + i}").Clear();

            if (!isLastPage)
                return;

            SetValue(ws, "G28", Money(model.GrandTotal) + " " + model.Company.Currency);

            // The official template has no dedicated due-date cell, so the payment deadline rides
            // along in the free-form notes cell, ahead of the description.
            if (model.PaymentDueDate.HasValue)
                AppendValue(ws, "AE29", "مهلت پرداخت: " + PersianDate.ToDisplayString(model.PaymentDueDate.Value).ToPersianDigits());

            if (!string.IsNullOrWhiteSpace(model.Description))
                AppendValue(ws, "AE29", model.Description);
        }

        private static void SetValue(IXLWorksheet ws, string address, string? value)
        {
            if (string.IsNullOrWhiteSpace(value))
                return;

            ws.Cell(address).Value = value;
        }

        private static void AppendValue(IXLWorksheet ws, string address, string? value)
        {
            if (string.IsNullOrWhiteSpace(value))
                return;

            var cell = ws.Cell(address);
            cell.Value = $"{cell.GetString()} {value}";
        }

        private static string Money(ulong value) => value.ToString("N0").ToPersianDigits();

        private static List<List<InvoiceLineModel>> Chunk(List<InvoiceLineModel> source, int size)
        {
            var result = new List<List<InvoiceLineModel>>();
            for (var i = 0; i < source.Count; i += size)
                result.Add(source.Skip(i).Take(size).ToList());

            return result;
        }

        public byte[] RenderBarcodeLabels(BarcodeLabelSheetModel model) => _questPdfDocumentService.RenderBarcodeLabels(model);
    }
}
