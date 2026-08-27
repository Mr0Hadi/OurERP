using Application.Common.Contracts.Barcode;

namespace Application.Common.Contracts.Documents
{
    /// <summary>Seller identity printed on every document. Comes from the Company config section.</summary>
    public class CompanyInfo
    {
        public string Name { get; set; } = string.Empty;
        public string? NationalId { get; set; }
        public string? EconomicCode { get; set; }
        public string? RegistrationNumber { get; set; }
        public string? Address { get; set; }
        public string? PhoneNumber { get; set; }
        public string? PostalCode { get; set; }
        public string? Province { get; set; }
        public string? City { get; set; }
        public string Currency { get; set; } = "ریال";
    }

    public class PartyInfo
    {
        public string Name { get; set; } = string.Empty;
        public string? PhoneNumber { get; set; }
        public string? Address { get; set; }
        public string? PostalCode { get; set; }
        public string? EconomicCode { get; set; }
        public string? NationalId { get; set; }
        public string? RegistrationNumber { get; set; }
        public string? Province { get; set; }
        public string? City { get; set; }
    }

    public class InvoiceLineModel
    {
        public int RowNumber { get; set; }
        public string ProductCode { get; set; } = string.Empty;
        public string ProductName { get; set; } = string.Empty;
        public int Quantity { get; set; }
        public ulong UnitPrice { get; set; }
        public ulong DiscountAmount { get; set; }
        public ulong TaxAmount { get; set; }
        public ulong LineTotal { get; set; }
    }

    public class InvoiceDocumentModel
    {
        public string Title { get; set; } = string.Empty;
        public string DocumentNumber { get; set; } = string.Empty;
        public DateTime DocumentDate { get; set; }
        public string StatusText { get; set; } = string.Empty;
        public string? Description { get; set; }

        public CompanyInfo Company { get; set; } = new();

        /// <summary>Header label for the counterparty box: "خریدار" on sales, "فروشنده" on purchases.</summary>
        public string CounterpartyLabel { get; set; } = "خریدار";
        public PartyInfo Counterparty { get; set; } = new();

        public List<InvoiceLineModel> Lines { get; set; } = new();

        public ulong SubTotal { get; set; }
        public ulong TotalDiscount { get; set; }
        public ulong TotalTax { get; set; }
        public ulong GrandTotal { get; set; }
        public ulong PaidAmount { get; set; }
        public long Balance { get; set; }
    }

    public class BarcodeLabelModel
    {
        public string ProductName { get; set; } = string.Empty;
        public string BarcodePayload { get; set; } = string.Empty;
        public string HumanReadable { get; set; } = string.Empty;
        public ulong? Price { get; set; }
    }

    public enum BarcodeLabelLayoutMode
    {
        /// <summary>N-up grid on a normal sheet (A4 self-adhesive label paper).</summary>
        SHEET = 1,

        /// <summary>One label per page, page sized to the label (thermal roll printers).</summary>
        ROLL = 2
    }

    public class BarcodeLabelSheetModel
    {
        public List<BarcodeLabelModel> Labels { get; set; } = new();
        public BarcodeLabelLayoutMode Mode { get; set; } = BarcodeLabelLayoutMode.SHEET;

        // 3 columns * 48mm + 2 gaps * 2mm = 148mm, fits inside A4 (210mm) minus 2*8mm margins
        // (194mm) with room to spare. 4 columns at these defaults does not fit - tune alongside
        // LabelWidthMm/PageMarginMm if the target label sheet's real dimensions differ.
        public int Columns { get; set; } = 3;
        public int Rows { get; set; } = 10;
        public decimal LabelWidthMm { get; set; } = 48;
        public decimal LabelHeightMm { get; set; } = 25;
        public decimal PageMarginMm { get; set; } = 8;
        public decimal HorizontalGapMm { get; set; } = 2;
        public decimal VerticalGapMm { get; set; } = 2;
        public bool ShowProductName { get; set; } = true;
        public bool ShowPrice { get; set; }
        public string Currency { get; set; } = "ریال";
        public BarcodeRenderOptions BarcodeOptions { get; set; } = new();
    }

    public interface IPdfDocumentService
    {
        /// <summary>
        /// Renders an invoice-shaped document (sale, purchase, or credit note - they share one
        /// official Excel template, converted to PDF via LibreOffice headless - see
        /// ExcelInvoiceDocumentService). Async because, unlike RenderBarcodeLabels, it touches the
        /// filesystem (temp files) and shells out to an external process.
        /// </summary>
        Task<byte[]> RenderInvoiceAsync(InvoiceDocumentModel model, CancellationToken cancellationToken = default);

        byte[] RenderBarcodeLabels(BarcodeLabelSheetModel model);
    }
}
