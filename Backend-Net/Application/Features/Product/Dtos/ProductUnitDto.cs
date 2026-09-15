using Domain.Enums;

namespace Application.Features.Product.Dtos
{
    public class ProductUnitDto
    {
        public int Id { get; set; }
        public int ProductId { get; set; }
        public string ProductName { get; set; }
        public int SerialNumber { get; set; }
        public string Barcode { get; set; }
        public string BarcodePayload { get; set; }
        public ProductUnitStatusEnum Status { get; set; }
        public int? PurchaseItemId { get; set; }
        public int? SaleItemId { get; set; }
        public DateTime? SoldAt { get; set; }

        /// <summary>The purchase the unit arrived on, and its supplier - so a list row can say where a unit came
        /// from without a request per row. Null for units with no purchase line (opening balance, manual adjustment).</summary>
        public int? PurchaseId { get; set; }
        public string? PurchaseInvoiceNumber { get; set; }
        public int? SupplierId { get; set; }
        public string? SupplierName { get; set; }

        /// <summary>The sale the unit last left on, and its customer. Null for a unit never sold.</summary>
        public int? SaleId { get; set; }
        public string? SaleInvoiceNumber { get; set; }
        public int? CustomerId { get; set; }
        public string? CustomerName { get; set; }
    }
}
