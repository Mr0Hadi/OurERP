using System.Globalization;
using System.Reflection;
using Application.Common.Contracts.Barcode;
using Application.Common.Contracts.Documents;
using Common.Extensions;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace Infrastructure.Services
{
    public class QuestPdfDocumentService : IPdfDocumentService
    {
        private const string FontFamily = "Vazirmatn";
        private static readonly object FontLock = new();
        private static bool _fontsRegistered;

        private readonly IBarcodeRenderer _barcodeRenderer;

        public QuestPdfDocumentService(IBarcodeRenderer barcodeRenderer)
        {
            _barcodeRenderer = barcodeRenderer;
            EnsureFontsRegistered();
        }

        private static void EnsureFontsRegistered()
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

        public byte[] RenderInvoice(InvoiceDocumentModel model)
        {
            return Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Size(PageSizes.A4);
                    page.Margin(12, Unit.Millimetre);
                    page.ContentFromRightToLeft();
                    page.DefaultTextStyle(x => x.FontFamily(FontFamily).FontSize(9));

                    page.Header().Element(e => ComposeInvoiceHeader(e, model));
                    page.Content().PaddingVertical(6).Element(e => ComposeInvoiceBody(e, model));
                    page.Footer().AlignCenter().Text(t =>
                    {
                        t.DefaultTextStyle(s => s.FontSize(7).FontColor(Colors.Grey.Darken1));
                        t.Span("صفحه ");
                        t.CurrentPageNumber();
                        t.Span(" از ");
                        t.TotalPages();
                    });
                });
            }).GeneratePdf();
        }

        private void ComposeInvoiceHeader(IContainer container, InvoiceDocumentModel model)
        {
            container.Row(row =>
            {
                row.RelativeItem().Column(col =>
                {
                    col.Item().Text(model.Title).FontSize(15).Bold();
                    col.Item().PaddingTop(3).Text($"شماره: {model.DocumentNumber}".ToPersianDigits());
                    col.Item().Text($"تاریخ: {PersianDate.ToDisplayString(model.DocumentDate)}".ToPersianDigits());
                    if (!string.IsNullOrWhiteSpace(model.StatusText))
                        col.Item().Text($"وضعیت: {model.StatusText}");
                });

                row.ConstantItem(28, Unit.Millimetre).AlignLeft().Element(e =>
                {
                    var qr = _barcodeRenderer.RenderQrSvg(model.DocumentNumber, 26m);
                    e.Width(26, Unit.Millimetre).Height(26, Unit.Millimetre).Svg(qr);
                });
            });
        }

        private static void ComposeInvoiceBody(IContainer container, InvoiceDocumentModel model)
        {
            container.Column(col =>
            {
                col.Item().PaddingBottom(6).Row(row =>
                {
                    row.RelativeItem().Border(0.5f).BorderColor(Colors.Grey.Medium).Padding(5).Column(c =>
                    {
                        c.Item().Text("فروشنده").Bold();
                        c.Item().Text(model.Company.Name);
                        if (!string.IsNullOrWhiteSpace(model.Company.NationalId))
                            c.Item().Text($"شناسه ملی: {model.Company.NationalId}".ToPersianDigits());
                        if (!string.IsNullOrWhiteSpace(model.Company.EconomicCode))
                            c.Item().Text($"کد اقتصادی: {model.Company.EconomicCode}".ToPersianDigits());
                        if (!string.IsNullOrWhiteSpace(model.Company.PhoneNumber))
                            c.Item().Text($"تلفن: {model.Company.PhoneNumber}".ToPersianDigits());
                        if (!string.IsNullOrWhiteSpace(model.Company.Address))
                            c.Item().Text($"نشانی: {model.Company.Address}");
                    });

                    row.ConstantItem(5);

                    row.RelativeItem().Border(0.5f).BorderColor(Colors.Grey.Medium).Padding(5).Column(c =>
                    {
                        c.Item().Text(model.CounterpartyLabel).Bold();
                        c.Item().Text(model.Counterparty.Name);
                        if (!string.IsNullOrWhiteSpace(model.Counterparty.PhoneNumber))
                            c.Item().Text($"تلفن: {model.Counterparty.PhoneNumber}".ToPersianDigits());
                        if (!string.IsNullOrWhiteSpace(model.Counterparty.PostalCode))
                            c.Item().Text($"کد پستی: {model.Counterparty.PostalCode}".ToPersianDigits());
                        if (!string.IsNullOrWhiteSpace(model.Counterparty.Address))
                            c.Item().Text($"نشانی: {model.Counterparty.Address}");
                    });
                });

                col.Item().Table(table =>
                {
                    table.ColumnsDefinition(c =>
                    {
                        c.ConstantColumn(24);  // row number
                        c.RelativeColumn(2.2f); // product code
                        c.RelativeColumn(3.4f); // name
                        c.RelativeColumn(1);    // qty
                        c.RelativeColumn(1.8f); // unit price
                        c.RelativeColumn(1.5f); // discount
                        c.RelativeColumn(1.5f); // tax
                        c.RelativeColumn(2);    // total
                    });

                    table.Header(header =>
                    {
                        foreach (var text in new[] { "ردیف", "کد کالا", "شرح کالا", "تعداد", "مبلغ واحد", "تخفیف", "مالیات", "جمع" })
                        {
                            header.Cell().Background(Colors.Grey.Lighten3).Border(0.5f).BorderColor(Colors.Grey.Medium)
                                .Padding(3).AlignCenter().Text(text).Bold().FontSize(8);
                        }
                    });

                    foreach (var line in model.Lines)
                    {
                        BodyCell(table, line.RowNumber.ToString());
                        BodyCell(table, line.ProductCode);
                        BodyCell(table, line.ProductName, alignRight: true);
                        BodyCell(table, line.Quantity.ToString());
                        BodyCell(table, Money(line.UnitPrice));
                        BodyCell(table, Money(line.DiscountAmount));
                        BodyCell(table, Money(line.TaxAmount));
                        BodyCell(table, Money(line.LineTotal));
                    }
                });

                col.Item().PaddingTop(6).AlignLeft().Width(75, Unit.Millimetre).Column(c =>
                {
                    TotalRow(c, "جمع کل", model.SubTotal, model.Company.Currency);
                    TotalRow(c, "تخفیف", model.TotalDiscount, model.Company.Currency);
                    TotalRow(c, "مالیات", model.TotalTax, model.Company.Currency);
                    TotalRow(c, "قابل پرداخت", model.GrandTotal, model.Company.Currency, bold: true);
                    TotalRow(c, "پرداخت‌شده", model.PaidAmount, model.Company.Currency);
                    c.Item().PaddingTop(1).Row(r =>
                    {
                        r.RelativeItem().Text("مانده").Bold();
                        r.RelativeItem().AlignLeft().Text($"{model.Balance:N0} {model.Company.Currency}".ToPersianDigits()).Bold();
                    });
                });

                col.Item().PaddingTop(6).Text($"مبلغ به حروف: {NumberToPersianWords.ToWordsWithCurrency(model.GrandTotal, model.Company.Currency)}");

                if (!string.IsNullOrWhiteSpace(model.Description))
                    col.Item().PaddingTop(3).Text($"توضیحات: {model.Description}");

                col.Item().PaddingTop(16).Row(r =>
                {
                    r.RelativeItem().AlignCenter().Text("مهر و امضای فروشنده");
                    r.RelativeItem().AlignCenter().Text("امضای خریدار");
                });
            });
        }

        private static void BodyCell(TableDescriptor table, string text, bool alignRight = false)
        {
            var cell = table.Cell().Border(0.5f).BorderColor(Colors.Grey.Lighten1).Padding(3);
            var aligned = alignRight ? cell.AlignRight() : cell.AlignCenter();
            aligned.Text(text.ToPersianDigits()).FontSize(8);
        }

        private static void TotalRow(ColumnDescriptor col, string label, ulong value, string currency, bool bold = false)
        {
            col.Item().Row(r =>
            {
                var labelText = r.RelativeItem().Text(label);
                var valueText = r.RelativeItem().AlignLeft().Text($"{value:N0} {currency}".ToPersianDigits());
                if (bold)
                {
                    labelText.Bold();
                    valueText.Bold();
                }
            });
        }

        private static string Money(ulong value) => value.ToString("N0", CultureInfo.InvariantCulture).ToPersianDigits();

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
