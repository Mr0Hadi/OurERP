using Domain.Enums;

namespace Application.Features.Cheque.Dtos
{
    /// <summary>One cheque: a CHECK payment row, received (IN) or issued/passed on (OUT).</summary>
    public class ChequeDto
    {
        /// <summary>The payment row's id - what CashCheck/BounceCheck/EndorseCheck take.</summary>
        public int Id { get; set; }
        public PaymentDirectionEnum Direction { get; set; }
        public decimal Amount { get; set; }

        public string? CheckNumber { get; set; }
        public DateTime? CheckDueDate { get; set; }
        public string? CheckBankName { get; set; }
        public string? CheckDrawerName { get; set; }

        public PaymentCheckStatusEnum Status { get; set; }
        public string StatusTitle { get; set; } = string.Empty;
        public DateTime? StatusChangedAt { get; set; }
        public string? StatusNote { get; set; }

        /// <summary>Days until the date on the cheque (negative = past due). Null without a due date.</summary>
        public int? DaysToDue { get; set; }

        /// <summary>When it was received or issued (the payment's PaidAt).</summary>
        public DateTime PaidAt { get; set; }
        public PaymentPurposeEnum Purpose { get; set; }

        public bool IsCustomer { get; set; }
        public int? PartyId { get; set; }
        public string? PartyName { get; set; }
        public int? SaleId { get; set; }
        public int? PurchaseId { get; set; }
        public string? InvoiceNumber { get; set; }
        public bool IsOnAccount { get; set; }

        /// <summary>The account it was cashed into/out of (or is drawn on, for an issued cheque).</summary>
        public int? BankAccountId { get; set; }
        public string? BankAccountTitle { get; set; }

        /// <summary>A cheque passed on: the received row it was, and on that received row, the row it became.</summary>
        public int? EndorsedFromPaymentDetailId { get; set; }
        public int? EndorsedToPaymentDetailId { get; set; }

        public string? Description { get; set; }
    }

    /// <summary>Totals over the whole filter, not just the page.</summary>
    public class ChequeListSummaryDto
    {
        public int PendingReceivedCount { get; set; }
        public decimal PendingReceivedAmount { get; set; }
        public int PendingIssuedCount { get; set; }
        public decimal PendingIssuedAmount { get; set; }

        /// <summary>Pending cheques whose date has already passed (received / issued).</summary>
        public decimal PastDueReceivedAmount { get; set; }
        public decimal PastDueIssuedAmount { get; set; }
    }
}
