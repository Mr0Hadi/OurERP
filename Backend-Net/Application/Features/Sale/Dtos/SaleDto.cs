using Domain.Enums;

namespace Application.Features.Sale.Dtos
{
    public class SaleItemDto
    {
        public int ProductId { get; set; }
        public string ProductName { get; set; }
    }

    public class SaleDto
    {
        public int Id { get; set; }
        public string InvoiceNumber { get; set; }
        public DateTime InvoiceDate { get; set; }
        public SalesStatusEnum Status { get; set; }
        public PaymentTypeEnum PaymentType { get; set; }
        public UInt64 TotalAmount { get; set; }
        public UInt64 PaidAmount { get; set; }
        public string? Description { get; set; }
        public int CustomerId { get; set; }
        public string CustomerName { get; set; }
        public List<SaleItemDto> Items { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}
