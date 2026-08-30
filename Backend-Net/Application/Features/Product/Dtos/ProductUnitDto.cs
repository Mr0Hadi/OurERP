using Domain.Enums;

namespace Application.Features.Product.Dtos
{
    public class ProductUnitDto
    {
        public int Id { get; set; }
        public int ProductId { get; set; }
        public int SerialNumber { get; set; }
        public string Barcode { get; set; }
        public string BarcodePayload { get; set; }
        public ProductUnitStatusEnum Status { get; set; }
        public int? PurchaseItemId { get; set; }
        public int? SaleItemId { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? SoldAt { get; set; }
    }
}