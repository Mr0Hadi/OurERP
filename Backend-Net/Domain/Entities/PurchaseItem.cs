using Domain.Enums;

namespace Domain.Entities
{
    public class PurchaseItem
    {
        public int Id { get; set; }
        public int ProductId { get; set; }
        public string ProductCode { get; set; }
        public string ProductName { get; set; }
        public ProductUnitEnum Unit { get; set; }
        public int Quantity { get; set; }
        public UInt64 UnitPrice { get; set; }
        public int Discount { get; set; }
        public UInt64 TotalCost { get; set; }
        public Product Product { get; set; }
    }
}
