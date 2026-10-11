using Domain.Enums;

namespace Application.Features.Accounting.Dtos
{
    /// <summary>
    /// One customer or supplier in the party balance table (جدول حساب اشخاص). Debit/Credit/Balance come from the party
    /// ledger (positive balance = the party owes us); Aging and OpenItemCount come from the open documents and
    /// installments (see AccountingDocuments.LoadOpenItemsAsync).
    /// </summary>
    public class PartyBalanceRowDto
    {
        public AccountingPartyTypeEnum PartyType { get; set; }
        public int PartyId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Phone { get; set; }
        public bool IsActive { get; set; }

        /// <summary>Customers only: the credit limit set on the customer, if any.</summary>
        public decimal? CreditLimit { get; set; }
        public decimal TotalDebit { get; set; }
        public decimal TotalCredit { get; set; }

        /// <summary>TotalDebit - TotalCredit. Positive = the party owes us, negative = we owe the party.</summary>
        public decimal Balance { get; set; }
        public DateTime? LastEntryAt { get; set; }
        public DateTime? LastPaymentAt { get; set; }

        /// <summary>Open invoices plus unpaid installments of this party. Filled after paging.</summary>
        public int OpenItemCount { get; set; }

        /// <summary>Filled after paging.</summary>
        public AgingDto Aging { get; set; } = new();
    }

    public class PartyBalanceSummaryDto
    {
        public int Count { get; set; }
        public decimal TotalDebit { get; set; }
        public decimal TotalCredit { get; set; }

        /// <summary>Sum of positive balances: what parties owe us.</summary>
        public decimal TotalReceivable { get; set; }

        /// <summary>Sum of negative balances, as a positive number: what we owe parties.</summary>
        public decimal TotalPayable { get; set; }

        /// <summary>TotalReceivable - TotalPayable.</summary>
        public decimal Net { get; set; }
        public int DebtorCount { get; set; }
        public int CreditorCount { get; set; }

        /// <summary>Aging of what the customers in the filter still owe us.</summary>
        public AgingDto ReceivableAging { get; set; } = new();

        /// <summary>Aging of what we still owe the suppliers in the filter.</summary>
        public AgingDto PayableAging { get; set; } = new();
    }

    /// <summary>One party-ledger row across all parties (دفتر حساب اشخاص).</summary>
    public class PartyLedgerEntryRowDto
    {
        public int Id { get; set; }
        public DateTime OccurredAt { get; set; }
        public DateTime CreatedAt { get; set; }
        public AccountingPartyTypeEnum PartyType { get; set; }
        public int PartyId { get; set; }
        public string PartyName { get; set; } = string.Empty;
        public PartyLedgerEntryTypeEnum EntryType { get; set; }

        /// <summary>Filled after paging.</summary>
        public string EntryTypeTitle { get; set; } = string.Empty;
        public PartyLedgerDirectionEnum Direction { get; set; }

        /// <summary>Exactly one of Debit / Credit is non-zero.</summary>
        public decimal Debit { get; set; }
        public decimal Credit { get; set; }
        public string? Description { get; set; }
        public int? SaleId { get; set; }
        public int? PurchaseId { get; set; }

        /// <summary>The sale's or purchase's invoice number, when the row belongs to one.</summary>
        public string? InvoiceNumber { get; set; }
        public int? PaymentDetailId { get; set; }

        /// <summary>For a PAYMENT row: how the money moved.</summary>
        public PaymentTypeEnum? PaymentType { get; set; }
        public int? SaleReturnClaimId { get; set; }
        public int? PurchaseReturnClaimId { get; set; }
        public int? PurchaseItemId { get; set; }

        /// <summary>On a REVERSAL: the row it takes back.</summary>
        public int? ReversalOfEntryId { get; set; }

        /// <summary>True when a later REVERSAL takes this row back.</summary>
        public bool IsReversed { get; set; }
    }

    public class PartyLedgerEntrySummaryDto
    {
        public int Count { get; set; }
        public decimal TotalDebit { get; set; }
        public decimal TotalCredit { get; set; }

        /// <summary>TotalDebit - TotalCredit.</summary>
        public decimal Net { get; set; }
    }
}
