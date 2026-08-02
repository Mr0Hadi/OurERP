using Domain.Enums;

namespace Domain.Entities
{
    public class Product
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public string Code { get; set; }
        public string BarCode { get; set; }
        public string Brand { get; set; }
        public ProductUnitEnum Unit { get; set; }
        public UInt64 PurchasePrice { get; set; }
        public UInt64 RetailPrice { get; set; }
        public UInt64 WholeSalePrice { get; set; }
        public int Tax { get; set; }
        public int Stock { get; set; }
        public int LowStockThreshold { get; set; }
        public string? ImageUrl { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public int ProductCategoryId { get; set; }
        public ProductCategory ProductCategory { get; set; }
    }
}
