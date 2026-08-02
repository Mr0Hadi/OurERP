namespace Application.Features.PurchaseReceiving.Dtos
{
    public class PurchaseReceiptItemDto
    {
        public int Id { get; set; }
        public int PurchaseReceiptId { get; set; }
        public int PurchaseItemId { get; set; }
        public string ProductName { get; set; }
        public int QuantityReceived { get; set; }
        public UInt64 UnitCost { get; set; }
        public List<ReceiptDiscrepancyDto> Discrepancies { get; set; }
    }
}
