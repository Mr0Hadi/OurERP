using Domain.Enums;

namespace Application.Common.Contracts.ProductCode
{
    public class BarcodeReference
    {
        public BarcodeReferenceKindEnum Kind { get; set; }
        public string NormalizedPayload { get; set; } = string.Empty;
        public int? ProductId { get; set; }
        public int? SerialNumber { get; set; }
    }

    /// <summary>
    /// Builds and parses the project's product-code/barcode pattern (see
    /// docs/product-code-barcode-invoice-design.fa.md). Pure/stateless - no DB access,
    /// so it can be unit tested and reused by both the code-generation and the
    /// scan/lookup paths without drifting apart.
    /// </summary>
    public interface IProductCodeService
    {
        /// <summary>"14050512-123" - date segment (8 digits) + product id, no zero padding.</summary>
        string BuildProductCode(int productId, DateTime createdAt);

        /// <summary>
        /// The canonical form compared against stored payloads - Parse(...).NormalizedPayload.
        /// The dashes stay: they are part of the code and go into the barcode/QR symbol too,
        /// which is what lets the segments have variable length.
        /// </summary>
        string ToPayload(string humanReadableCode);

        /// <summary>"14050512-123-2" - product code + serial, no zero padding.</summary>
        string BuildUnitBarcode(string productCode, int serialNumber);

        /// <summary>
        /// Normalizes raw scanner/keyboard input (Persian digits, dash variants, whitespace) and
        /// classifies it by its dash-separated segments: date-productId is a product-level code,
        /// date-productId-serial a unit-level barcode, anything else UNKNOWN. NormalizedPayload
        /// drops any leading zeros typed in the id segments.
        /// </summary>
        BarcodeReference Parse(string scannedInput);
    }
}
