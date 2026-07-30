using Domain.Entities;
using Domain.Enums;

namespace Application.Features.Purchase.Dtos
{
    public class PurchaseItemDto
    {
        public int Id { get; set; }
        public int ProductId { get; set; }
        public string ProductName { get; set; }
        public int Quantity { get; set; }
        public UInt64 UnitPrice { get; set; }
        public int Discount { get; set; }
    }

    public class PurchasePaymentDetailDto
    {
        public PaymentTypeEnum Type { get; set; }
        public decimal Amount { get; set; }
        public string? CheckNumber { get; set; }
        public string? TransferRef { get; set; }
    }

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
        public List<PurchasePaymentDetailDto> PaymentDetails { get; set; }
    }
}
