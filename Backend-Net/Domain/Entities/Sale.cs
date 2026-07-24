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
        public UInt64 PaidAmount { get; set; }
        public UInt64 TotalAmount { get; set; }
        public string Description { get; set; }
        public List<Product> Item { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public Customer Customer { get; set; }
        public int CustomerId { get; set; }
    }
}
