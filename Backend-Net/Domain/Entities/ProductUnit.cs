using Domain.Enums;

namespace Domain.Entities
{
    public class ProductUnit
    {
        public int Id { get; set; }
        public int ProductId { get; set; }
        public Product Product { get; set; }

        public int SerialNumber { get; set; }
        public string Barcode { get; set; }
        public string BarcodePayload { get; set; }

        public ProductUnitStatusEnum Status { get; set; }

        public int? PurchaseItemId { get; set; }
        public int? SaleItemId { get; set; }

        public DateTime CreatedAt { get; set; }
        public DateTime? SoldAt { get; set; }
        public bool IsActive { get; set; }
    }
}
