using Domain.Enums;

namespace Application.Features.PurchaseReturn.Dtos
{
    public class PurchaseReturnDto
    {
        public int Id { get; set; }
        public string ReturnNumber { get; set; }
        public int PurchaseId { get; set; }
        public string PurchaseInvoiceNumber { get; set; }
        public int SupplierId { get; set; }
        public string SupplierName { get; set; }
        public DateTime ReturnDate { get; set; }
        public PurchaseReturnStatusEnum Status { get; set; }
        public string? Description { get; set; }
        public int TotalQuantity { get; set; }
        public UInt64 TotalAmount { get; set; }
        public List<PurchaseReturnItemDto> Items { get; set; }
    }
}
