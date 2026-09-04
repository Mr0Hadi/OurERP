using Application.Common.Contracts.Barcode;
using Application.Common.Contracts.Documents;
using Infrastructure.Services;

namespace WMS.Tests.Unit
{
    /// <summary>
    /// QuestPDF/ZXing failures (missing font resource, malformed SVG, encoder exceptions) only
    /// surface at runtime - nothing here is caught by the compiler - so these smoke tests just
    /// confirm rendering actually produces output instead of throwing.
    /// </summary>
    public class PdfAndBarcodeSmokeTests
    {
        static PdfAndBarcodeSmokeTests()
        {
            // Also set in WMS.Tests.Support.TestDatabase's static ctor - this class doesn't use
            // TestDatabase, so it needs its own.
            QuestPDF.Settings.License = QuestPDF.Infrastructure.LicenseType.Community;
        }

        [Fact]
        public void RenderCode128Svg_ProducesNonEmptySvg()
        {
            var renderer = new ZXingBarcodeRenderer();
            var svg = renderer.RenderCode128Svg("14050512000123000002", "14050512-000123-000002", new BarcodeRenderOptions());

            Assert.StartsWith("<svg", svg);
            Assert.Contains("<rect", svg);
        }

        [Fact]
        public void RenderQrSvg_ProducesNonEmptySvg()
        {
            var renderer = new ZXingBarcodeRenderer();
            var svg = renderer.RenderQrSvg("S-2026-0001", 26m);

            Assert.StartsWith("<svg", svg);
        }

        // Invoice rendering (InvoiceDocumentModel -> PDF) moved to ExcelInvoiceDocumentService,
        // which fills the official Excel template and shells out to LibreOffice headless - see
        // Tests/WMS.Tests/Integration/InvoicePdfTests.cs, which exercises it end-to-end (and
        // requires `soffice` on the test runner).

        // The QuestPDF invoice renderer (the process-free alternative engine, selected via
        // InvoiceRenderer:Engine) can be smoke-tested here instead - unlike the LibreOffice path it
        // needs nothing installed on the runner.
        [Fact]
        public async Task RenderInvoiceAsync_QuestPdfEngine_ProducesNonEmptyPdf()
        {
            var service = new QuestPdfInvoiceDocumentService(new QuestPdfDocumentService(new ZXingBarcodeRenderer()));
            var model = new InvoiceDocumentModel
            {
                Title = "صورتحساب فروش کالا و خدمات",
                DocumentNumber = "S-2026-0001",
                DocumentDate = new DateTime(2026, 8, 30),
                PaymentDueDate = new DateTime(2026, 9, 29),
                Company = new CompanyInfo { Name = "شرکت تست", City = "تهران", Currency = "ریال" },
                CounterpartyLabel = "خریدار",
                Counterparty = new PartyInfo { Name = "مشتری تست", City = "اصفهان" },
                Lines = new()
                {
                    new InvoiceLineModel { RowNumber = 1, ProductCode = "14050512-000123", ProductName = "کالای تست", Quantity = 2, UnitPrice = 150000, LineTotal = 300000 },
                    new InvoiceLineModel { RowNumber = 2, ProductCode = "14050512-000124", ProductName = "کالای دوم", Quantity = 1, UnitPrice = 90000, DiscountAmount = 5000, TaxAmount = 7650, LineTotal = 92650 },
                },
                SubTotal = 390000,
                TotalDiscount = 5000,
                TotalTax = 7650,
                GrandTotal = 392650,
                Description = "توضیحات تست",
            };

            var bytes = await service.RenderInvoiceAsync(model);

            Assert.NotEmpty(bytes);
            Assert.Equal("%PDF", System.Text.Encoding.ASCII.GetString(bytes, 0, 4));
        }

        [Fact]
        public void RenderBarcodeLabels_SheetMode_ProducesNonEmptyPdf()
        {
            var service = new QuestPdfDocumentService(new ZXingBarcodeRenderer());
            var model = new BarcodeLabelSheetModel
            {
                Labels = new()
                {
                    new BarcodeLabelModel { ProductName = "کالای تست", BarcodePayload = "14050512000123000001", HumanReadable = "14050512-000123-000001" },
                    new BarcodeLabelModel { ProductName = "کالای تست", BarcodePayload = "14050512000123000002", HumanReadable = "14050512-000123-000002" },
                },
            };

            var bytes = service.RenderBarcodeLabels(model);

            Assert.NotEmpty(bytes);
            Assert.Equal("%PDF", System.Text.Encoding.ASCII.GetString(bytes, 0, 4));
        }
    }
}
