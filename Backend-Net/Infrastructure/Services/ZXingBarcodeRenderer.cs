using System.Globalization;
using System.Text;
using Application.Common.Contracts.Barcode;
using Common.Exceptions;
using ZXing;
using ZXing.Common;
using ZXing.QrCode.Internal;

namespace Infrastructure.Services
{
    /// <summary>
    /// Uses ZXing only for encoding (it produces a BitMatrix - pure module data, no rendering),
    /// then emits the modules as vector SVG rectangles. That keeps the battle-tested Code128
    /// checksum/subset logic while giving resolution-independent output.
    /// </summary>
    public class ZXingBarcodeRenderer : IBarcodeRenderer
    {
        public string RenderCode128Svg(string payload, string? humanReadableText, BarcodeRenderOptions options)
        {
            if (string.IsNullOrWhiteSpace(payload))
                throw new ValidationCustomException("محتوای بارکد نمی‌تواند خالی باشد.");

            var writer = new MultiFormatWriter();
            BitMatrix matrix;
            try
            {
                // Height 1: we only want the module pattern; the visual height is applied below in mm.
                matrix = writer.encode(payload, BarcodeFormat.CODE_128, 0, 1, new Dictionary<EncodeHintType, object>
                {
                    { EncodeHintType.MARGIN, 0 },
                });
            }
            catch (Exception ex)
            {
                throw new ValidationCustomException($"امکان تولید بارکد برای «{payload}» وجود ندارد: {ex.Message}");
            }

            var moduleCount = matrix.Width;
            var quietZone = options.QuietZoneModules;
            var moduleWidth = options.ModuleWidthMm;

            var totalWidthMm = (moduleCount + quietZone * 2) * moduleWidth;
            var textHeightMm = options.ShowHumanReadable ? PtToMm(options.HumanReadableFontSizePt) * 1.6m : 0m;
            var totalHeightMm = options.BarHeightMm + textHeightMm;

            var sb = new StringBuilder();
            sb.Append(CultureInfo.InvariantCulture, $"<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"{Mm(totalWidthMm)}mm\" height=\"{Mm(totalHeightMm)}mm\" viewBox=\"0 0 {Mm(totalWidthMm)} {Mm(totalHeightMm)}\">");
            sb.Append(CultureInfo.InvariantCulture, $"<rect x=\"0\" y=\"0\" width=\"{Mm(totalWidthMm)}\" height=\"{Mm(totalHeightMm)}\" fill=\"#ffffff\"/>");

            // Emit runs of black modules as single rects rather than one rect per module - fewer
            // nodes, and adjacent rects can't develop hairline gaps at some zoom levels.
            var x = 0;
            while (x < moduleCount)
            {
                if (!matrix[x, 0])
                {
                    x++;
                    continue;
                }

                var runStart = x;
                while (x < moduleCount && matrix[x, 0])
                    x++;

                var rectX = (quietZone + runStart) * moduleWidth;
                var rectWidth = (x - runStart) * moduleWidth;
                sb.Append(CultureInfo.InvariantCulture, $"<rect x=\"{Mm(rectX)}\" y=\"0\" width=\"{Mm(rectWidth)}\" height=\"{Mm(options.BarHeightMm)}\" fill=\"#000000\"/>");
            }

            if (options.ShowHumanReadable)
            {
                var text = System.Security.SecurityElement.Escape(humanReadableText ?? payload);
                var fontSizeMm = PtToMm(options.HumanReadableFontSizePt);
                var baseline = options.BarHeightMm + fontSizeMm * 1.1m;
                sb.Append(CultureInfo.InvariantCulture,
                    $"<text x=\"{Mm(totalWidthMm / 2)}\" y=\"{Mm(baseline)}\" font-family=\"monospace\" font-size=\"{Mm(fontSizeMm)}\" text-anchor=\"middle\" fill=\"#000000\">{text}</text>");
            }

            sb.Append("</svg>");
            return sb.ToString();
        }

        public string RenderQrSvg(string payload, decimal sizeMm, int quietZoneModules = 4)
        {
            if (string.IsNullOrWhiteSpace(payload))
                throw new ValidationCustomException("محتوای QR نمی‌تواند خالی باشد.");

            var writer = new MultiFormatWriter();
            var matrix = writer.encode(payload, BarcodeFormat.QR_CODE, 0, 0, new Dictionary<EncodeHintType, object>
            {
                { EncodeHintType.MARGIN, 0 },
                { EncodeHintType.ERROR_CORRECTION, ErrorCorrectionLevel.M },
            });

            var modules = matrix.Width;
            var totalModules = modules + quietZoneModules * 2;
            var moduleSize = sizeMm / totalModules;

            var sb = new StringBuilder();
            sb.Append(CultureInfo.InvariantCulture, $"<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"{Mm(sizeMm)}mm\" height=\"{Mm(sizeMm)}mm\" viewBox=\"0 0 {Mm(sizeMm)} {Mm(sizeMm)}\">");
            sb.Append(CultureInfo.InvariantCulture, $"<rect x=\"0\" y=\"0\" width=\"{Mm(sizeMm)}\" height=\"{Mm(sizeMm)}\" fill=\"#ffffff\"/>");

            for (var y = 0; y < matrix.Height; y++)
            {
                var x = 0;
                while (x < modules)
                {
                    if (!matrix[x, y])
                    {
                        x++;
                        continue;
                    }

                    var runStart = x;
                    while (x < modules && matrix[x, y])
                        x++;

                    var rectX = (quietZoneModules + runStart) * moduleSize;
                    var rectY = (quietZoneModules + y) * moduleSize;
                    var rectWidth = (x - runStart) * moduleSize;
                    sb.Append(CultureInfo.InvariantCulture, $"<rect x=\"{Mm(rectX)}\" y=\"{Mm(rectY)}\" width=\"{Mm(rectWidth)}\" height=\"{Mm(moduleSize)}\" fill=\"#000000\"/>");
                }
            }

            sb.Append("</svg>");
            return sb.ToString();
        }

        private static decimal PtToMm(decimal pt) => pt * 25.4m / 72m;

        private static string Mm(decimal value) => Math.Round(value, 4).ToString(CultureInfo.InvariantCulture);
    }
}
