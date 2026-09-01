using Domain.Enums;

namespace Domain.Entities
{
    public class Sale
    {
        public int Id { get; set; }
        public string InvoiceNumber { get; set; }
        public DateTime InvoiceDate { get; set; }
        public SalesStatusEnum Status { get; set; }
        public PaymentTypeEnum PaymentType { get; set; }
        public List<PaymentDetail> PaymentDetails { get; set; }
        public UInt64 PaidAmount { get; set; }
        public UInt64 TotalAmount { get; set; }
        public string? Description { get; set; }
        public List<SaleItem> Items { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public Customer Customer { get; set; }
        public int CustomerId { get; set; }
        public User? SalesUser { get; set; }
        public int? SalesUserId { get; set; }

        public List<SaleDriver> Drivers { get; set; } = new();
        public List<SaleShippingNote> ShippingNotes { get; set; } = new();
    }
}
