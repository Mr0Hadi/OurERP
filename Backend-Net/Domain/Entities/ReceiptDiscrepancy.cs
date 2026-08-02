using Domain.Enums;

namespace Domain.Entities
{
    public class ReceiptDiscrepancy
    {
        public int Id { get; set; }
        public int Quantity { get; set; }
        public DiscrepancyTypeEnum DiscrepancyType { get; set; }
        public string? Reason { get; set; }
        public DiscrepancyStatusEnum Status { get; set; }
        public List<DiscrepancyDecision> Decisions { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public PurchaseReceipt PurchaseReceipt { get; set; }
        public int PurchaseReceiptId { get; set; }
        public PurchaseReceiptItem PurchaseReceiptItem { get; set; }
        public int PurchaseReceiptItemId { get; set; }
    }
}
