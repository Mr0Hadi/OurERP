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
        public int? PreviousReturnId { get; set; }

        /// <summary>Return number of <see cref="PreviousReturnId"/>, so the client can name the
        /// related return without a second call. Null when this return starts a chain.</summary>
        public string? PreviousReturnNumber { get; set; }
        public ReturnStatusEnum Status { get; set; }
        public UInt64 TotalAmount { get; set; }
        public int Quantity { get; set; }
        public int DecidedQuantity { get; set; }
        public int RemainingQuantity { get; set; }
        public bool CanDelete { get; set; }
        public bool CanCancel { get; set; }
        public bool CanReject { get; set; }
        public bool CanReopen { get; set; }
        public List<PurchaseReturnClaimDto> Claims { get; set; } = new();

        /// <summary>Photos captured on the receiving rounds that opened or extended this return.</summary>
        public List<PurchaseReceivingImageDto> ReceivingImages { get; set; } = new();
    }
}
