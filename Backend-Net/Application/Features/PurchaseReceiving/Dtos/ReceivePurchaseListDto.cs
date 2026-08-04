using Domain.Enums;

namespace Application.Features.PurchaseReceiving.Dtos
{
    public class ReceivePurchaseListItemDto
    {
        public int Id { get; set; }
        public int ProductId { get; set; }
        public string ProductCode { get; set; }
        public string ProductName { get; set; }
        public string Unit { get; set; }
        public int OrderedQty { get; set; }
        public int ReceivedQuantity { get; set; }
        public int ReceivableQty { get; set; }
        public UInt64 UnitPrice { get; set; }
        public int Discount { get; set; }
    }

    public class ReceivePurchaseListDto
    {
        public int Id { get; set; }
        public string InvoiceNumber { get; set; }
        public DateTime InvoiceDate { get; set; }
        public PurchaseStatusEnum Status { get; set; }
        public int SupplierId { get; set; }
        public string SupplierName { get; set; }
        public UInt64 TotalAmount { get; set; }
        public UInt64 PaidAmount { get; set; }
        public PaymentTypeEnum PaymentType { get; set; }
        public List<ReceivePurchaseListItemDto> Items { get; set; }
    }
}
