using Domain.Enums;

namespace Domain.Entities
{
    public class PurchaseReceipt
    {
        public int Id { get; set; }
        public string ReceiptNumber { get; set; }
        public DateTime ReceiptDate { get; set; }
        public PurchaseReceiptStatusEnum Status { get; set; }
        public string? Description { get; set; }
        public List<PurchaseReceiptItem> Items { get; set; }
        public Purchase Purchase { get; set; }
        public int PurchaseId { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}
