using System.Reflection;
using Application.Common.Contracts.Barcode;
using Application.Common.Contracts.Documents;
using Common.Extensions;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace Infrastructure.Services
{
    /// <summary>
    /// Barcode/QR label-sheet rendering only - invoice rendering moved to the Excel-template +
    /// LibreOffice pipeline in ExcelInvoiceDocumentService, which holds this class to reuse it for
    /// RenderBarcodeLabels. No longer implements IPdfDocumentService directly for that reason.
    /// QuestPdfInvoiceDocumentService (the process-free alternative invoice renderer) holds it for
    /// the same reason, and shares this class's Persian font registration.
    /// </summary>
    public class QuestPdfDocumentService
    {
        /// <summary>
        /// Persian font family embedded in this assembly - the only one guaranteed present on a
        /// server with no fonts installed. Shared with QuestPdfInvoiceDocumentService.
        /// </summary>
        public const string FontFamily = "Vazirmatn";
        private static readonly object FontLock = new();
        private static bool _fontsRegistered;

        private readonly IBarcodeRenderer _barcodeRenderer;

        public QuestPdfDocumentService(IBarcodeRenderer barcodeRenderer)
        {
            _barcodeRenderer = barcodeRenderer;
            EnsureFontsRegistered();
        }

        /// <summary>
        /// Registers the embedded Vazirmatn .ttf resources with QuestPDF exactly once per process.
        /// Public and static so the sibling invoice renderer can call it without duplicating the
        /// resource scan - QuestPDF's FontManager is a global, so one registration serves both.
        /// </summary>
        public static void EnsureFontsRegistered()
        {
            if (_fontsRegistered)
                return;

            lock (FontLock)
            {
                if (_fontsRegistered)
                    return;

                var assembly = Assembly.GetExecutingAssembly();
                foreach (var name in assembly.GetManifestResourceNames().Where(x => x.EndsWith(".ttf", StringComparison.OrdinalIgnoreCase)))
                {
                    using var stream = assembly.GetManifestResourceStream(name);
                    if (stream != null)
                        QuestPDF.Drawing.FontManager.RegisterFont(stream);
                }

                _fontsRegistered = true;
            }
        }

        public byte[] RenderBarcodeLabels(BarcodeLabelSheetModel model)
        {
            // Pre-render each label's barcode once; the same SVG string is reused if a label
            // repeats across copies.
            var svgCache = new Dictionary<string, string>();
            string SvgFor(BarcodeLabelModel label)
            {
                if (!svgCache.TryGetValue(label.BarcodePayload, out var svg))
                {
                    svg = _barcodeRenderer.RenderCode128Svg(label.BarcodePayload, label.HumanReadable, model.BarcodeOptions);
                    svgCache[label.BarcodePayload] = svg;
                }
                return svg;
            }

            return Document.Create(container =>
            {
                if (model.Mode == BarcodeLabelLayoutMode.ROLL)
                {
                    foreach (var label in model.Labels)
                    {
                        container.Page(page =>
                        {
                            page.Size((float)model.LabelWidthMm, (float)model.LabelHeightMm, Unit.Millimetre);
                            page.Margin(1, Unit.Millimetre);
                            page.DefaultTextStyle(x => x.FontFamily(FontFamily).FontSize(6));
                            page.Content().Element(e => ComposeLabel(e, label, model, SvgFor(label)));
                        });
                    }
                    return;
                }

                var perPage = Math.Max(1, model.Columns * model.Rows);
                foreach (var pageLabels in Chunk(model.Labels, perPage))
                {
                    container.Page(page =>
                    {
                        page.Size(PageSizes.A4);
                        page.Margin((float)model.PageMarginMm, Unit.Millimetre);
                        page.DefaultTextStyle(x => x.FontFamily(FontFamily).FontSize(6));

                        page.Content().Column(col =>
                        {
                            col.Spacing((float)model.VerticalGapMm, Unit.Millimetre);

                            foreach (var rowLabels in Chunk(pageLabels, model.Columns))
                            {
                                col.Item().Row(row =>
                                {
                                    row.Spacing((float)model.HorizontalGapMm, Unit.Millimetre);

                                    foreach (var label in rowLabels)
                                    {
                                        row.ConstantItem((float)model.LabelWidthMm, Unit.Millimetre)
                                            .Height((float)model.LabelHeightMm, Unit.Millimetre)
                                            .Element(e => ComposeLabel(e, label, model, SvgFor(label)));
                                    }

                                    // Pad the last row so the remaining labels stay left-aligned in the grid.
                                    for (var i = rowLabels.Count; i < model.Columns; i++)
                                        row.ConstantItem((float)model.LabelWidthMm, Unit.Millimetre);
                                });
                            }
                        });
                    });
                }
            }).GeneratePdf();
        }

        private static void ComposeLabel(IContainer container, BarcodeLabelModel label, BarcodeLabelSheetModel model, string svg)
        {
            container.Padding(1).Column(col =>
            {
                if (model.ShowProductName)
                    col.Item().AlignCenter().Text(label.ProductName).FontSize(6).ClampLines(1);

                // The barcode's natural size (from the module count/width in BarcodeOptions) can
                // exceed the label - forcing it into an explicit box makes QuestPDF scale it down
                // to fit rather than throw a layout exception. Uniform scaling doesn't affect
                // decodability (only relative bar widths matter), so this is safe.
                var barcodeHeight = Math.Max(6m, model.LabelHeightMm - 6m - (model.ShowPrice ? 3m : 0m));
                col.Item().PaddingVertical(1).AlignCenter()
                    .Width((float)(model.LabelWidthMm - 2), Unit.Millimetre)
                    .Height((float)barcodeHeight, Unit.Millimetre)
                    .Svg(svg);

                if (model.ShowPrice && label.Price.HasValue)
                    col.Item().AlignCenter().Text($"{label.Price.Value:N0} {model.Currency}".ToPersianDigits()).FontSize(6);
            });
        }

        private static IEnumerable<List<T>> Chunk<T>(IEnumerable<T> source, int size)
        {
            var bucket = new List<T>(size);
            foreach (var item in source)
            {
                bucket.Add(item);
                if (bucket.Count != size)
                    continue;

                yield return bucket;
                bucket = new List<T>(size);
            }

            if (bucket.Count > 0)
                yield return bucket;
        }
    }
}
