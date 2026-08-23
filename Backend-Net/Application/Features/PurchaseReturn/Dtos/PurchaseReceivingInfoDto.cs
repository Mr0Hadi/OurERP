using Domain.Enums;

namespace Application.Features.PurchaseReturn.Dtos
{
    public class PurchaseReceivingInfoDto
    {
        public int PurchaseId { get; set; }
        public string InvoiceNumber { get; set; }
        public DateTime InvoiceDate { get; set; }
        public PurchaseStatusEnum Status { get; set; }
        public int SupplierId { get; set; }
        public string SupplierName { get; set; }
        public int? ActivePurchaseReturnId { get; set; }
        public List<PurchaseReceivingItemInfoDto> Items { get; set; } = new();

        /// <summary>
        /// Every photo taken across all receiving rounds for this purchase, oldest first -
        /// including rounds whose return has since been deleted, and rounds that produced no
        /// return at all.
        /// </summary>
        public List<PurchaseReceivingImageDto> ReceivingImages { get; set; } = new();
    }

    public class PurchaseReceivingItemInfoDto
    {
        public int PurchaseItemId { get; set; }
        public int ProductId { get; set; }
        public string ProductCode { get; set; }
        public string ProductName { get; set; }
        public string Unit { get; set; }
        public UInt64 UnitPrice { get; set; }
        public int OrderedQuantity { get; set; }
        public int ReceivedQuantity { get; set; }
        public int SettledQuantity { get; set; }
        public int OpenIssueQuantity { get; set; }
        public int ReceivableQuantity { get; set; }
        public List<PurchaseReceivingOpenIssueDto> OpenIssues { get; set; } = new();
    }

    public class PurchaseReceivingOpenIssueDto
    {
        public int PurchaseReturnItemId { get; set; }
        public PurchaseIssueTypeEnum Type { get; set; }
        public int Quantity { get; set; }
        public int DecidedQuantity { get; set; }
        public string? Note { get; set; }
    }
}
