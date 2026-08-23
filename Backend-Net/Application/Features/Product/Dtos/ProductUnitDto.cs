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

    /// <summary>
    /// What the warehouse screen gets back from a scan: always the product, plus the specific
    /// unit when a unit-level barcode was scanned ("وقتی اسکنش کرد اطلاعات کامل رو نشون بده").
    /// </summary>
    public class ScanBarcodeResultDto
    {
        public BarcodeReferenceKindEnum Kind { get; set; }
        public string NormalizedPayload { get; set; }
        public ProductDto Product { get; set; }
        public string CategoryName { get; set; }
        public ProductUnitDto? Unit { get; set; }
    }
}
