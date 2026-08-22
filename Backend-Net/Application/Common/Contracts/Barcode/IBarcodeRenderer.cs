namespace Application.Common.Contracts.Barcode
{
    public class BarcodeRenderOptions
    {
        /// <summary>
        /// The X-dimension: printed width of one barcode module, in millimetres. 0.33mm scans
        /// reliably off a 203dpi thermal label printer (the common warehouse case). If labels come
        /// out unreadable, raise this rather than lowering it; do not go below ~0.25mm.
        /// </summary>
        public decimal ModuleWidthMm { get; set; } = 0.33m;

        public decimal BarHeightMm { get; set; } = 12m;

        /// <summary>White margin either side, in modules. Code128 requires at least 10.</summary>
        public int QuietZoneModules { get; set; } = 10;

        public bool ShowHumanReadable { get; set; } = true;

        public decimal HumanReadableFontSizePt { get; set; } = 7m;
    }

    /// <summary>
    /// Renders barcodes as vector SVG. Vector rather than raster on purpose: the printer/label
    /// hardware isn't decided yet, and a raster barcode printed at the wrong DPI is the most
    /// common cause of an unscannable label (see docs/product-code-barcode-invoice-design.fa.md 2.1).
    /// </summary>
    public interface IBarcodeRenderer
    {
        /// <summary>
        /// Code128 (subset C is chosen automatically for the all-digit payloads this project
        /// generates, halving the printed width). <paramref name="humanReadableText"/> is what
        /// gets printed under the bars - normally the dashed form of the same code.
        /// </summary>
        string RenderCode128Svg(string payload, string? humanReadableText, BarcodeRenderOptions options);

        string RenderQrSvg(string payload, decimal sizeMm, int quietZoneModules = 4);
    }
}
