namespace Application.Features.PurchaseReceiving.Dtos
{
    public class CreatePurchaseReceiptItemDto
    {
        public int PurchaseItemId { get; set; }
        public int QuantityReceived { get; set; }
    }
}
