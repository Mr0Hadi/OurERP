using Domain.Enums;

namespace Application.Features.Treasury.Dtos
{
    public class BankAccountDto
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public BankAccountKindEnum Kind { get; set; }
        public string KindTitle { get; set; } = string.Empty;
        public string? BankName { get; set; }
        public string? AccountNumber { get; set; }
        public string? CardNumber { get; set; }
        public string? Iban { get; set; }
        public UInt64 OpeningBalance { get; set; }
        public DateTime OpeningDate { get; set; }
        public string? Description { get; set; }
        public bool IsActive { get; set; }

        /// <summary>
        /// Current balance: opening balance + payment rows in - payment rows out + transfers in - transfers out, voided ones
        /// excluded. Can be negative when the recorded movements say more left than was there - a sign of a missing entry.
        /// </summary>
        public decimal Balance { get; set; }
    }

    public class BankAccountListDto
    {
        public List<BankAccountDto> Accounts { get; set; } = new();

        /// <summary>Over the listed accounts.</summary>
        public decimal TotalCashBoxBalance { get; set; }
        public decimal TotalBankBalance { get; set; }
        public decimal TotalBalance { get; set; }

        /// <summary>
        /// Money recorded with no account at all (rows from before accounts existed, or while Payment.RequireBankAccount is
        /// off): net in minus out. Shown so the totals above can be reconciled against all receipts and payments.
        /// </summary>
        public decimal UnassignedNet { get; set; }
    }

    /// <summary>One line of an account's statement: a receipt/payment, or one side of a transfer between our accounts.</summary>
    public class BankAccountMovementDto
    {
        public BankAccountMovementKindEnum Kind { get; set; }
        public DateTime OccurredAt { get; set; }
        public decimal In { get; set; }
        public decimal Out { get; set; }

        /// <summary>Running balance after this line.</summary>
        public decimal Balance { get; set; }

        // PAYMENT lines
        public int? PaymentDetailId { get; set; }
        public PaymentTypeEnum? PaymentType { get; set; }
        public int? SaleId { get; set; }
        public int? PurchaseId { get; set; }
        public string? InvoiceNumber { get; set; }
        public int? CustomerId { get; set; }
        public int? SupplierId { get; set; }
        public string? PartyName { get; set; }

        /// <summary>A payment with no invoice (PartyAccount/AddPartyPayment).</summary>
        public bool IsOnAccount { get; set; }

        // TRANSFER lines
        public int? TransferId { get; set; }
        public int? CounterpartBankAccountId { get; set; }
        public string? CounterpartBankAccountTitle { get; set; }

        /// <summary>Cheque number or transfer/RRN reference.</summary>
        public string? Reference { get; set; }
        public string? Description { get; set; }
    }

    public class BankAccountStatementDto
    {
        public BankAccountDto Account { get; set; } = new();
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }

        /// <summary>Balance before the first line: the opening balance plus everything before FromDate.</summary>
        public decimal OpeningBalance { get; set; }
        public decimal TotalIn { get; set; }
        public decimal TotalOut { get; set; }
        public decimal ClosingBalance { get; set; }
        public List<BankAccountMovementDto> Rows { get; set; } = new();
    }

    public class BankAccountTransferDto
    {
        public int Id { get; set; }
        public int FromBankAccountId { get; set; }
        public string FromBankAccountTitle { get; set; } = string.Empty;
        public int ToBankAccountId { get; set; }
        public string ToBankAccountTitle { get; set; } = string.Empty;
        public UInt64 Amount { get; set; }
        public DateTime TransferredAt { get; set; }
        public string? TransferRef { get; set; }
        public string? Description { get; set; }
        public DateTime? VoidedAt { get; set; }
        public DateTime RecordedAt { get; set; }
        public int? RecordedByUserId { get; set; }
    }

    /// <summary>An entry of the account picker (GetBankAccountOptions).</summary>
    public class BankAccountOptionDto
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public BankAccountKindEnum Kind { get; set; }
        public string? BankName { get; set; }
    }
}
