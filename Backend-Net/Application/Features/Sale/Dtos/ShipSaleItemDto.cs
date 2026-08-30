namespace Application.Features.Sale.Dtos
{
    public class ShipSaleItemDto
    {
        public int SaleItemId { get; set; }
        public int ShippedQuantity { get; set; }

        /// <summary>
        /// Optional: barcodes of the specific ProductUnit rows the seller scanned for this
        /// line. Count must equal ShippedQuantity when given. If omitted, units are picked
        /// FIFO by serial (see docs/product-code-barcode-invoice-design.fa.md section 1.8).
        /// </summary>
        public List<string>? ProductUnitBarcodes { get; set; }
    }
}
