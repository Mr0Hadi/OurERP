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
        /// <summary>"14050512-0000000123" - date segment (8 digits) + zero-padded product id (10 digits).</summary>
        string BuildProductCode(int productId, DateTime createdAt);

        /// <summary>"140505120000000123" - BuildProductCode with the separators stripped.</summary>
        string ToPayload(string humanReadableCode);

        /// <summary>"14050512-0000000123-0000000002" - product code + zero-padded serial (10 digits).</summary>
        string BuildUnitBarcode(string productCode, int serialNumber);

        /// <summary>
        /// Normalizes raw scanner/keyboard input (strips every non-digit) and classifies it
        /// as a product-level code (18 digits) or a unit-level barcode (28 digits) by length.
        /// The trailing scan-and-ignore-the-tail rule from the design lives here: a 20-digit
        /// payload's first 18 digits are always a valid product-code payload too.
        /// </summary>
        BarcodeReference Parse(string scannedInput);
    }
}
