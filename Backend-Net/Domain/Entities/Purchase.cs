using Domain.Enums;

namespace Domain.Entities
{
    public class Purchase
    {
        public int Id { get; set; }
        public string InvoiceNumber { get; set; }
        public DateTime InvoiceDate { get; set; }
        public DateTime PaymentDate { get; set; }
        public PurchaseStatusEnum Status { get; set; }
        public PaymentTypeEnum PaymentType { get; set; }
        public List<PaymentDetail> PaymentDetails { get; set; }
        public UInt64 PaidAmount { get; set; }
        public UInt64 TotalAmount { get; set; }
        public string? Description { get; set; }
        public List<PurchaseItem> Items { get; set; }
        public Supplier Supplier { get; set; }
        public int SupplierId { get; set; }
        public User? PurchasingUser { get; set; }
        public int? PurchasingUserId { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }

        public List<PurchaseDriver> Drivers { get; set; } = new();
        public List<PurchaseReceivingNote> ReceivingNotes { get; set; } = new();
    }
}
