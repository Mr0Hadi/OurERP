namespace Application.Features.Purchase.Dtos
{
    public class CreatePurchaseItemDto
    {
        public int ProductId { get; set; }
        public int Quantity { get; set; }
        public UInt64 UnitPrice { get; set; }
        public int Discount { get; set; }
    }
}
