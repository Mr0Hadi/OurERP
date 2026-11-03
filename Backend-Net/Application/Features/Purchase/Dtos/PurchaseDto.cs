using Application.Common.Dtos;
using Domain.Enums;

namespace Application.Features.Purchase.Dtos
{
    public class PurchaseDto
    {
        public int Id { get; set; }
        public string InvoiceNumber { get; set; }
        public DateTime? InvoiceDate { get; set; }
        public DateTime? PaymentDate { get; set; }
        public PurchaseStatusEnum Status { get; set; }
        public PaymentTypeEnum PaymentType { get; set; }
        public UInt64 TotalAmount { get; set; }

        /// <summary>
        /// What we actually owe for this purchase: TotalAmount (the issued invoice, never edited) minus the share of every line
        /// closed short. Debt = PayableAmount - PaidAmount.
        /// </summary>
        public UInt64 PayableAmount { get; set; }
        public UInt64 PaidAmount { get; set; }
        public string? Description { get; set; }
        public int SupplierId { get; set; }
        public string SupplierName { get; set; }
        public List<PurchaseItemDto> Items { get; set; }
        public List<PaymentDetailDto> PaymentDetails { get; set; }

        /// <summary>On-account payments applied to this document (PartyAccount/AllocatePartyPayment); active ones count in PaidAmount.</summary>
        public List<PaymentAllocationDto> PaymentAllocations { get; set; } = new();
        public List<PurchaseDriverDto> Drivers { get; set; } = new();
        public List<PurchaseReceivingNoteDto> ReceivingNotes { get; set; } = new();
        public List<DocumentAttachmentDto> Attachments { get; set; } = new();

        /// <summary>When anything on the purchase last changed. Send it back on UpdatePurchase: a newer server copy answers 409.</summary>
        public DateTime UpdatedAt { get; set; }

        // What the server allows now (PurchaseDocumentRules, the same calls the commands make; frontend-requests 13.1).
        /// <summary>DeletePurchase: a proforma with no live payment of its own.</summary>
        public bool CanDelete { get; set; }
        /// <summary>ChangePurchaseStatus to CANCELLED.</summary>
        public bool CanCancel { get; set; }
        /// <summary>The other ChangePurchaseStatus targets accepted now (PENDING/SHIPPED), current status and CANCELLED excluded.</summary>
        public List<PurchaseStatusEnum> AllowedStatuses { get; set; } = new();
        /// <summary>CreatePurchaseReturn: not cancelled, and something has arrived (on a line, or held in quarantine).</summary>
        public bool CanCreateReturn { get; set; }
    }

    public class PurchaseDriverDto
    {
        public int Id { get; set; }
        public string DriverFullName { get; set; }
        public string DriverPhoneNumber { get; set; }
        public string VehiclePlate { get; set; }
    }

    public class PurchaseReceivingNoteDto
    {
        public int Id { get; set; }
        public string Note { get; set; }
    }
}
