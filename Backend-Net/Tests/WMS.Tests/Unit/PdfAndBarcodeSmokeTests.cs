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
