using Domain.Enums;

namespace Application.Features.PartyAccount.Dtos
{
    /// <summary>A customer's or supplier's account over a period. Positive balances = the party owes us.</summary>
    public class PartyStatementDto
    {
        public int? CustomerId { get; set; }
        public int? SupplierId { get; set; }
        public string PartyName { get; set; } = string.Empty;
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }

        /// <summary>Balance of every row before FromDate (0 when no FromDate).</summary>
        public decimal OpeningBalance { get; set; }
        public decimal TotalDebit { get; set; }
        public decimal TotalCredit { get; set; }

        /// <summary>OpeningBalance + TotalDebit - TotalCredit.</summary>
        public decimal ClosingBalance { get; set; }
        public List<PartyStatementEntryDto> Entries { get; set; } = new();
    }

    public class PartyStatementEntryDto
    {
        public int Id { get; set; }
        public DateTime OccurredAt { get; set; }
        public PartyLedgerEntryTypeEnum EntryType { get; set; }
        public string EntryTypeTitle { get; set; } = string.Empty;
        public PartyLedgerDirectionEnum Direction { get; set; }

        /// <summary>The amount in its column: exactly one of Debit / Credit is non-zero.</summary>
        public decimal Debit { get; set; }
        public decimal Credit { get; set; }

        /// <summary>Balance after this row, starting from OpeningBalance.</summary>
        public decimal RunningBalance { get; set; }
        public string? Description { get; set; }
        public int? SaleId { get; set; }
        public int? PurchaseId { get; set; }
        public int? PaymentDetailId { get; set; }
        public int? SaleReturnClaimId { get; set; }
        public int? PurchaseReturnClaimId { get; set; }

        /// <summary>Set on a REVERSAL: the row it takes back.</summary>
        public int? ReversalOfEntryId { get; set; }
    }
}
