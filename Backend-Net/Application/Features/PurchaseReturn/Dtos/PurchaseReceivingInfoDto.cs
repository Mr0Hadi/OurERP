using Domain.Enums;

namespace Application.Features.PurchaseReturn.Dtos
{
    public class PurchaseReceivingInfoDto
    {
        public int PurchaseId { get; set; }
        public string InvoiceNumber { get; set; }
        public DateTime? InvoiceDate { get; set; }
        public PurchaseStatusEnum Status { get; set; }
        public int SupplierId { get; set; }
        public string SupplierName { get; set; }
        public List<PurchaseReceivingItemInfoDto> Items { get; set; } = new();

        /// <summary>Products held in quarantine on this purchase that it does not list.</summary>
        public List<PurchaseReceivingUnlistedInfoDto> UnlistedItems { get; set; } = new();

        /// <summary>Every discrepancy recorded across all receiving rounds, oldest first - for prefilling the discrepancy form.
        /// Quotas are not derived from these; the quarantined quantities above are the ones claims are checked against.</summary>
        public List<PurchaseReceivingDiscrepancyDto> Discrepancies { get; set; } = new();

        /// <summary>Every photo taken across all receiving rounds for this purchase, oldest first.</summary>
        public List<PurchaseReceivingImageDto> ReceivingImages { get; set; } = new();
    }

    public class PurchaseReceivingUnlistedInfoDto
    {
        public int ProductId { get; set; }
        public string ProductCode { get; set; }
        public string ProductName { get; set; }
        public string Unit { get; set; }
        public int QuarantinedQuantity { get; set; }
    }

    public class PurchaseReceivingDiscrepancyDto
    {
        public int Id { get; set; }
        public int? PurchaseItemId { get; set; }
        public int ProductId { get; set; }
        public string ProductName { get; set; }
        public UnitCustodyReasonEnum CustodyReason { get; set; }
        public ReturnProblemEnum Problem { get; set; }
        public int Quantity { get; set; }
        public string? Note { get; set; }
        public DateTime ReceivedAt { get; set; }
    }

    public class PurchaseReceivingItemInfoDto
    {
        /// <summary>Defective units counted on this line and still held in quarantine.</summary>
        public int QuarantinedOnOrderQuantity { get; set; }

        /// <summary>Excess units of this line still held in quarantine.</summary>
        public int QuarantinedExcessQuantity { get; set; }

        public int PurchaseItemId { get; set; }
        public int ProductId { get; set; }
        public string ProductCode { get; set; }
        public string ProductName { get; set; }
        public string Unit { get; set; }
        public UInt64 UnitPrice { get; set; }
        public int OrderedQuantity { get; set; }
        public int ReceivedQuantity { get; set; }
        public int StillOwedQuantity { get; set; }

        /// <summary>Ordered units written off the line by ClosePurchaseItem; not owed any more.</summary>
        public int ShortClosedQuantity { get; set; }
    }
}
