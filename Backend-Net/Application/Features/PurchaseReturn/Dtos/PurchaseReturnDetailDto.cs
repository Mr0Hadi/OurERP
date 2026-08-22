using Domain.Enums;

namespace Application.Features.PurchaseReturn.Dtos
{
    public class PurchaseReturnDetailDto
    {
        public int Id { get; set; }
        public string ReturnNumber { get; set; }
        public DateTime ReturnDate { get; set; }
        public int PurchaseId { get; set; }
        public string PurchaseInvoiceNumber { get; set; }
        public int SupplierId { get; set; }
        public string SupplierName { get; set; }
        public string? Description { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public PurchaseReturnStatusEnum Status { get; set; }
        public UInt64 TotalAmount { get; set; }
        public UInt64 FinalizedRefundAmount { get; set; }
        public int TotalQuantity { get; set; }
        public int AllocatedQuantity { get; set; }
        public bool CanDelete { get; set; }
        public bool CanCancel { get; set; }
        public bool CanReject { get; set; }
        public bool CanReopen { get; set; }
        public List<PurchaseReturnItemDto> Items { get; set; } = new();

        /// <summary>Photos captured on the receiving rounds that opened or extended this return.</summary>
        public List<PurchaseReceivingImageDto> ReceivingImages { get; set; } = new();
    }
}
