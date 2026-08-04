using Domain.Entities;
using Domain.Enums;

namespace Application.Features.WarehouseReceiving.Dtos
{
    public class ReceivePurchaseDto
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
        public List<PaymentDetail> PaymentDetails { get; set; }
        public List<ReceivePurchaseItemDto> Items { get; set; }
    }

    public class ReceivePurchaseItemDto
    {
        public int Id { get; set; }
        public int ProductId { get; set; }
        public Domain.Entities.Product Product { get; set; }
        public int OrderedQuantity { get; set; }
        public int ReceivedQuantity { get; set; }
        public int ReceivableQuantity { get; set; }
        public UInt64 UnitPrice { get; set; }
        public int Discount { get; set; }
    }
}
