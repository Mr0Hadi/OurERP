using Domain.Enums;

namespace Domain.Entities
{
    public class PurchaseItem
    {
        public int Id { get; set; }
        public int ProductId { get; set; }
        public int Quantity { get; set; }
        public UInt64 UnitPrice { get; set; }
        public int Discount { get; set; }
        public int ReceivedQuantity { get; set; }
        public int SettledQuantity { get; set; }
        public Product Product { get; set; }
        public int PurchaseId { get; set; }
        public Purchase Purchase { get; set; }
    }
}
