using Domain.Entities;
using Domain.Enums;

namespace Application.Features.WarehouseReceiving.Dtos
{
    public class ReceivePurchaseListDto
    {
        public int Id { get; set; }
        public string InvoiceNumber { get; set; }
        public DateTime InvoiceDate { get; set; }
        public ReceiveTypeEnum Type { get; set; }
        public int SupplierId { get; set; }
        public string SupplierName { get; set; }
        public UInt64 TotalAmount { get; set; }
        public int ItemCount { get; set; }
    }
}
