using Domain.Entities;
using Domain.Enums;

namespace Application.Features.Product.Dtos
{
    public class ProductDto
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
        public int ProductCategoryId { get; set; }
    }
}
