using Domain.Enums;

namespace Application.Common.Dtos
{
    /// <summary>
    /// Part of an on-account payment applied to a document. On a sale/purchase it says which receipt paid it; on the payment
    /// it says which documents it paid. A voided allocation stays listed and no longer counts.
    /// </summary>
    public class PaymentAllocationDto
    {
        public int Id { get; set; }

        /// <summary>The on-account payment (PartyAccount/GetPartyPaymentDetail).</summary>
        public int PaymentDetailId { get; set; }

        public int? SaleId { get; set; }
        public int? PurchaseId { get; set; }
        public string? InvoiceNumber { get; set; }

        public UInt64 Amount { get; set; }
        public DateTime AllocatedAt { get; set; }
        public int? AllocatedByUserId { get; set; }
        public DateTime? VoidedAt { get; set; }

        /// <summary>Of the payment itself, for display on the document.</summary>
        public PaymentTypeEnum PaymentType { get; set; }
        public DateTime PaymentPaidAt { get; set; }
        public string? BankAccountTitle { get; set; }
    }
}
