namespace Application.Features.Sale.Dtos
{
    public class ShipSaleItemDto
    {
        public int SaleItemId { get; set; }

        /// <summary>Units shipped against the line's ordered quantity. May be 0 when only excess is recorded.</summary>
        public int ShippedQuantity { get; set; }

        /// <summary>
        /// Optional: barcodes of the specific ProductUnit rows the seller scanned for this
        /// line. Count must equal ShippedQuantity when given. If omitted, units are picked
        /// FIFO by serial (see docs/product-code-barcode-invoice-design.fa.md section 1.8).
        /// Required for a product with RequiresUnitTracking.
        /// </summary>
        public List<string>? ProductUnitBarcodes { get; set; }

        /// <summary>
        /// Units that went to the customer beyond the order - by mistake, often discovered later when the shelf comes up short. Accepted
        /// on a fully shipped line too. They leave stock and the cost pool with no revenue (SALE_SHIPPED_EXCESS), are SOLD with custody
        /// EXCESS on this line, and are exactly what a sale-return EXCESS claim on the line may cover. ShippedQuantity is not changed.
        /// </summary>
        public int ExcessQuantity { get; set; }

        /// <summary>Scanned barcodes for the excess units; count must equal ExcessQuantity when given. Required with RequiresUnitTracking.</summary>
        public List<string>? ExcessProductUnitBarcodes { get; set; }
    }
}
