using Application.Common.Dtos;
using Domain.Enums;

namespace Application.Features.Purchase.Dtos
{
    public class PurchaseDto
    {
        public int Id { get; set; }
        public string InvoiceNumber { get; set; }
        public DateTime InvoiceDate { get; set; }
        public PurchaseStatusEnum Status { get; set; }
        public PaymentTypeEnum PaymentType { get; set; }
        public UInt64 TotalAmount { get; set; }
        public UInt64 PaidAmount { get; set; }
        public string? Description { get; set; }
        public int SupplierId { get; set; }
        public string SupplierName { get; set; }
        public List<PurchaseItemDto> Items { get; set; }
        public List<PaymentDetailDto> PaymentDetails { get; set; }
    }
}
