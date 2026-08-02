namespace Domain.Entities
{
    public class PurchaseReceiptItem
    {
        public int Id { get; set; }
        public int QuantityReceived { get; set; }
        public UInt64 UnitCost { get; set; }
        public List<ReceiptDiscrepancy> Discrepancies { get; set; }
        public PurchaseReceipt PurchaseReceipt { get; set; }
        public int PurchaseReceiptId { get; set; }
        public PurchaseItem PurchaseItem { get; set; }
        public int PurchaseItemId { get; set; }
    }
}
