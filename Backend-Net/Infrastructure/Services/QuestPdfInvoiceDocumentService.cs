using Application.Common.Contracts.Documents;
using Common.Extensions;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace Infrastructure.Services
{
    /// <summary>
    /// Process-free alternative to ExcelInvoiceDocumentService: renders the same
    /// InvoiceDocumentModel entirely in-process with QuestPDF, so a deploy target needs no
    /// LibreOffice installation (the Excel pipeline shells out to `soffice --headless`, which is
    /// the single external process dependency of the whole API). Which one is used is a
    /// configuration choice - see InvoiceRendererOptions and the IPdfDocumentService factory
    /// registration in InfrastructureServiceRegistration; LibreOffice remains the default.
    ///
    /// The layout mirrors the official government template's *shape* - title bar, seller box,
    /// counterparty box, the same eleven item columns in the same right-to-left order, totals
    /// footer, 7 lines per page - but deliberately does not chase its exact cell grid, merged-range
    /// boundaries or column widths. Reproducing an Excel sheet cell-for-cell in a layout engine
    /// with a completely different box model costs far more than it buys; anyone who needs a
    /// byte-faithful official document should stay on the LibreOffice engine.
    ///
    /// Barcode/QR label sheets are unrelated to invoices and stay on QuestPdfDocumentService,
    /// delegated to rather than duplicated - the same pattern ExcelInvoiceDocumentService uses.
    /// </summary>
    public class QuestPdfInvoiceDocumentService : IPdfDocumentService
    {
        // Same 7-rows-per-page grid the Excel template hard-codes. Kept identical so switching
        // engines doesn't change the page count of an already-issued document number.
        private const int LinesPerPage = 7;

        private static readonly string[] ColumnHeaders =
        {
            "ردیف", "کد کالا", "شرح کالا", "تعداد", "واحد", "مبلغ واحد", "مبلغ کل",
            "تخفیف", "مبلغ کل پس از تخفیف", "مالیات و عوارض", "جمع مبلغ کل",
        };

        // Relative widths taken from the template's merged column spans (B, D, G, T, W, Z, AE, AL,
        // AQ, AX, BC), so the columns keep roughly the proportions a reader of the official form
        // expects even though the absolute grid differs.
        private static readonly float[] ColumnWidths = { 2, 3, 13, 3, 3, 5, 7, 5, 7, 5, 5 };

        private const string BorderColor = "#8A8A8A";
        private const string HeaderBackground = "#EDEDED";

        private readonly QuestPdfDocumentService _questPdfDocumentService;

        public QuestPdfInvoiceDocumentService(QuestPdfDocumentService questPdfDocumentService)
        {
            _questPdfDocumentService = questPdfDocumentService;

            // Idempotent and process-global; called here too rather than relying on the injected
            // service's constructor having run, so the dependency stays an explicit collaborator
            // instead of a load-bearing side effect.
            QuestPdfDocumentService.EnsureFontsRegistered();
        }

        /// <summary>
        /// Task-returning to satisfy IPdfDocumentService, whose signature exists for the LibreOffice
        /// implementation's temp files and child process. This one is pure in-memory CPU work, so it
        /// completes synchronously rather than being wrapped in a fake `async`/Task.Run (see the
        /// codebase-wide async rule).
        /// </summary>
        public Task<byte[]> RenderInvoiceAsync(InvoiceDocumentModel model, CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();

            return Task.FromResult(Render(model));
        }

        private static byte[] Render(InvoiceDocumentModel model)
        {
            var pages = Chunk(model.Lines, LinesPerPage);
            if (pages.Count == 0)
                pages.Add(new List<InvoiceLineModel>());

            return Document.Create(container =>
            {
                for (var i = 0; i < pages.Count; i++)
                {
                    var pageLines = pages[i];
                    var pageNumber = i + 1;
                    var isLastPage = pageNumber == pages.Count;

                    container.Page(page =>
                    {
                        page.Size(PageSizes.A4);
                        page.Margin(10, Unit.Millimetre);

                        // Both are needed: ContentFromRightToLeft flips container/table layout
                        // order, DirectionFromRightToLeft fixes bidi resolution inside each text
                        // run (otherwise a Persian string ending in digits renders reversed).
                        page.ContentFromRightToLeft();
                        page.DefaultTextStyle(x => x.FontFamily(QuestPdfDocumentService.FontFamily)
                            .FontSize(8)
                            .DirectionFromRightToLeft());

                        page.Content().Column(col =>
                        {
                            col.Spacing(4);

                            col.Item().Element(e => ComposeHeader(e, model, pageNumber, pages.Count));
                            col.Item().Element(e => ComposePartyBox(e, "مشخصات فروشنده", ToParty(model.Company)));
                            col.Item().Element(e => ComposePartyBox(e, "مشخصات " + model.CounterpartyLabel, model.Counterparty));
                            col.Item().Element(e => ComposeItemTable(e, pageLines));

                            // Totals and the description print once, on the last page only -
                            // the same rule the Excel template's cloned sheets follow.
                            if (isLastPage)
                                col.Item().Element(e => ComposeFooter(e, model));
                        });
                    });
                }
            }).GeneratePdf();
        }

        private static void ComposeHeader(IContainer container, InvoiceDocumentModel model, int pageNumber, int pageCount)
        {
            container.Border(1).BorderColor(BorderColor).Background(HeaderBackground).Padding(6).Row(row =>
            {
                row.RelativeItem().Column(col =>
                {
                    col.Item().Text("شماره: " + model.DocumentNumber.ToPersianDigits()).FontSize(8);
                    col.Item().Text("تاریخ: " + PersianDate.ToDisplayString(model.DocumentDate).ToPersianDigits()).FontSize(8);
                });

                row.RelativeItem(2).AlignCenter().AlignMiddle().Column(col =>
                {
                    col.Item().AlignCenter().Text(model.Title).FontSize(13).Bold();

                    if (!string.IsNullOrWhiteSpace(model.StatusText))
                        col.Item().AlignCenter().Text(model.StatusText).FontSize(8);
                });

                row.RelativeItem().AlignLeft().AlignMiddle()
                    .Text($"صفحه {pageNumber} از {pageCount}".ToPersianDigits()).FontSize(8);
            });
        }

        /// <summary>
        /// Both identity boxes print the same nine fields in the same positions, exactly like the
        /// template's mirrored seller/buyer ranges - so one composer serves both. The seller box
        /// always carries our own company even on a purchase invoice (we are still the issuer),
        /// matching what the Excel implementation does.
        /// </summary>
        private static void ComposePartyBox(IContainer container, string title, PartyInfo party)
        {
            container.Border(1).BorderColor(BorderColor).Column(col =>
            {
                col.Item().Background(HeaderBackground).BorderBottom(1).BorderColor(BorderColor)
                    .Padding(3).Text(title).Bold().FontSize(9);

                col.Item().Padding(4).Column(inner =>
                {
                    inner.Spacing(3);

                    inner.Item().Row(row =>
                    {
                        Field(row, 3, "نام", party.Name);
                        Field(row, 2, "شماره اقتصادی", party.EconomicCode?.ToPersianDigits());
                        Field(row, 2, "شماره ثبت", party.RegistrationNumber?.ToPersianDigits());
                    });

                    inner.Item().Row(row =>
                    {
                        Field(row, 2, "استان", party.Province);
                        Field(row, 2, "شهر", party.City);
                        Field(row, 2, "کد پستی", party.PostalCode?.ToPersianDigits());
                        Field(row, 2, "شناسه ملی", party.NationalId?.ToPersianDigits());
                    });

                    inner.Item().Row(row =>
                    {
                        Field(row, 5, "نشانی", party.Address);
                        Field(row, 2, "تلفن", party.PhoneNumber?.ToPersianDigits());
                    });
                });
            });
        }

        private static void Field(RowDescriptor row, uint size, string label, string? value)
        {
            row.RelativeItem(size).Text(text =>
            {
                text.Span(label + ": ").SemiBold().FontSize(8);
                text.Span(string.IsNullOrWhiteSpace(value) ? "-" : value).FontSize(8);
            });
        }

        private static void ComposeItemTable(IContainer container, List<InvoiceLineModel> lines)
        {
            container.Table(table =>
            {
                table.ColumnsDefinition(columns =>
                {
                    foreach (var width in ColumnWidths)
                        columns.RelativeColumn(width);
                });

                table.Header(header =>
                {
                    foreach (var title in ColumnHeaders)
                        header.Cell().Element(HeaderCell).Text(title).Bold().FontSize(8);
                });

                foreach (var line in lines)
                {
                    var gross = (ulong)line.Quantity * line.UnitPrice;

                    table.Cell().Element(BodyCell).Text(line.RowNumber.ToString().ToPersianDigits());
                    table.Cell().Element(BodyCell).Text(line.ProductCode.ToPersianDigits());
                    table.Cell().Element(BodyCell).AlignRight().Text(line.ProductName);
                    table.Cell().Element(BodyCell).Text(line.Quantity.ToString().ToPersianDigits());
                    table.Cell().Element(BodyCell).Text("عدد");
                    table.Cell().Element(BodyCell).Text(Money(line.UnitPrice));
                    table.Cell().Element(BodyCell).Text(Money(gross));
                    table.Cell().Element(BodyCell).Text(Money(line.DiscountAmount));
                    table.Cell().Element(BodyCell).Text(Money(gross - line.DiscountAmount));
                    table.Cell().Element(BodyCell).Text(Money(line.TaxAmount));
                    table.Cell().Element(BodyCell).Text(Money(line.LineTotal));
                }

                // The official form always shows all seven rows of the grid, filled or not - a
                // short last page keeps the empty ruled rows rather than collapsing the box.
                for (var i = lines.Count; i < LinesPerPage; i++)
                {
                    for (var c = 0; c < ColumnWidths.Length; c++)
                        table.Cell().Element(BodyCell).Text(string.Empty);
                }
            });

            static IContainer HeaderCell(IContainer cell) => cell
                .Border(1).BorderColor(BorderColor).Background(HeaderBackground)
                .PaddingVertical(3).PaddingHorizontal(2).AlignCenter().AlignMiddle();

            static IContainer BodyCell(IContainer cell) => cell
                .Border(1).BorderColor(BorderColor)
                .PaddingVertical(3).PaddingHorizontal(2).AlignCenter().AlignMiddle()
                .MinHeight(16);
        }

        private static void ComposeFooter(IContainer container, InvoiceDocumentModel model)
        {
            container.Column(col =>
            {
                col.Spacing(4);

                col.Item().Border(1).BorderColor(BorderColor).Padding(4).Row(row =>
                {
                    Total(row, "جمع کل", model.SubTotal, model.Company.Currency);
                    Total(row, "جمع تخفیف", model.TotalDiscount, model.Company.Currency);
                    Total(row, "جمع مالیات و عوارض", model.TotalTax, model.Company.Currency);

                    row.RelativeItem(2).Text(text =>
                    {
                        text.Span("مبلغ قابل پرداخت: ").Bold().FontSize(9);
                        text.Span($"{Money(model.GrandTotal)} {model.Company.Currency}").Bold().FontSize(9);
                    });
                });

                col.Item().Border(1).BorderColor(BorderColor).Padding(4).Row(row =>
                {
                    Total(row, "پرداخت شده", model.PaidAmount, model.Company.Currency);

                    // Balance is signed (a credit note can leave us owing the counterparty), so it
                    // can't go through the unsigned Money helper the other totals use.
                    row.RelativeItem().Text(text =>
                    {
                        text.Span("مانده: ").SemiBold().FontSize(8);
                        text.Span($"{model.Balance:N0} {model.Company.Currency}".ToPersianDigits()).FontSize(8);
                    });
                });

                if (!string.IsNullOrWhiteSpace(model.Description))
                {
                    col.Item().Border(1).BorderColor(BorderColor).Padding(4).Text(text =>
                    {
                        text.Span("توضیحات: ").SemiBold().FontSize(8);
                        text.Span(model.Description).FontSize(8);
                    });
                }

                col.Item().PaddingTop(8).Row(row =>
                {
                    row.RelativeItem().AlignCenter().Text("مهر و امضای فروشنده").FontSize(8);
                    row.RelativeItem().AlignCenter().Text("مهر و امضای " + model.CounterpartyLabel).FontSize(8);
                });
            });
        }

        private static void Total(RowDescriptor row, string label, ulong value, string currency)
        {
            row.RelativeItem().Text(text =>
            {
                text.Span(label + ": ").SemiBold().FontSize(8);
                text.Span($"{Money(value)} {currency}").FontSize(8);
            });
        }

        /// <summary>
        /// CompanyInfo and PartyInfo carry the same identity fields under two types (the company
        /// one additionally holds the currency), so the seller box borrows the shared composer via
        /// this projection instead of a second near-identical layout method.
        /// </summary>
        private static PartyInfo ToParty(CompanyInfo company) => new()
        {
            Name = company.Name,
            PhoneNumber = company.PhoneNumber,
            Address = company.Address,
            PostalCode = company.PostalCode,
            EconomicCode = company.EconomicCode,
            NationalId = company.NationalId,
            RegistrationNumber = company.RegistrationNumber,
            Province = company.Province,
            City = company.City,
        };

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
