using Domain.Enums;

namespace Application.Features.Accounting.Dtos
{
    /// <summary>One payment row in the receipts-and-payments journal (دفتر دریافت و پرداخت).</summary>
    public class PaymentJournalRowDto
    {
        public int Id { get; set; }
        public DateTime PaidAt { get; set; }
        public DateTime? RecordedAt { get; set; }

        /// <summary>From our side: IN = money to us, OUT = money from us.</summary>
        public PaymentDirectionEnum Direction { get; set; }
        public PaymentTypeEnum Type { get; set; }
        public PaymentPurposeEnum Purpose { get; set; }
        public decimal Amount { get; set; }

        /// <summary>Set on a voided row. A voided row is listed (when asked for) but never counted in the summary.</summary>
        public DateTime? VoidedAt { get; set; }
        public DocumentSideEnum DocumentSide { get; set; }
        public int? SaleId { get; set; }
        public int? PurchaseId { get; set; }
        public string? InvoiceNumber { get; set; }

        /// <summary>A payment with no invoice (PartyAccount/AddPartyPayment); SaleId/PurchaseId/InvoiceNumber are then null.</summary>
        public bool IsOnAccount { get; set; }
        public int? BankAccountId { get; set; }
        public string? BankAccountTitle { get; set; }
        public string? Description { get; set; }
        public AccountingPartyTypeEnum PartyType { get; set; }
        public int PartyId { get; set; }
        public string PartyName { get; set; } = string.Empty;
        public string? CheckNumber { get; set; }
        public string? TransferRef { get; set; }
        public int? PosTerminalId { get; set; }
        public string? PosTerminalName { get; set; }
        public int? RecordedByUserId { get; set; }
        public string? RecordedByName { get; set; }
    }

    /// <summary>Totals of the non-voided rows matching the filter.</summary>
    public class PaymentJournalSummaryDto
    {
        public int Count { get; set; }
        public decimal TotalIn { get; set; }
        public decimal TotalOut { get; set; }

        /// <summary>TotalIn - TotalOut.</summary>
        public decimal Net { get; set; }
        public List<PaymentTypeTotalDto> ByType { get; set; } = new();
    }

    /// <summary>Money in and out through one payment method (cash, cheque, transfer...).</summary>
    public class PaymentTypeTotalDto
    {
        public PaymentTypeEnum Type { get; set; }
        public int Count { get; set; }
        public decimal In { get; set; }
        public decimal Out { get; set; }
        public decimal Net { get; set; }
    }
}
