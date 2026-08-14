using Domain.Enums;

namespace Application.Features.Sale.Dtos
{
    public class SaleListDto
    {
        public int Id { get; set; }
        public string InvoiceNumber { get; set; }
        public int CustomerId { get; set; }
        public string CustomerName { get; set; }
        public DateTime InvoiceDate { get; set; }
        public SalesStatusEnum Status { get; set; }
        public PaymentTypeEnum PaymentType { get; set; }
        public UInt64 TotalAmount { get; set; }
        public UInt64 PaidAmount { get; set; }
    }
}
