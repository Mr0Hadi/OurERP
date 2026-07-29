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
        public int PurchasePrice { get; set; }
        public int RetailPrice { get; set; }
        public int WholeSalePrice { get; set; }
        public int Tax { get; set; }
        public int Stock { get; set; }
        public int LowStockThreshold { get; set; }
        public string? ImageUrl { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public int ProductCategoryId { get; set; }
        public ProductCategory ProductCategory { get; set; }
    }
}
