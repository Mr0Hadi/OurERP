namespace Application.Features.Purchase.Dtos
{
    public class PurchaseItemDto
    {
        public int Id { get; set; }
        public int ProductId { get; set; }
        public string ProductName { get; set; }
        public string ProductCode { get; set; }
        public int Quantity { get; set; }
        public UInt64 UnitPrice { get; set; }
        public int Discount { get; set; }
        public int ReceivedQuantity { get; set; }
        public int SettledQuantity { get; set; }

        /// <summary>Ordered units the supplier will never deliver (ClosePurchaseItem); 0 while the line is open.</summary>
        public int ShortClosedQuantity { get; set; }
        public DateTime? ShortClosedAt { get; set; }
    }
}
