using Domain.Enums;

namespace Domain.Entities
{
    /// <summary>
    /// A place money sits: a cash box or a bank account. Every payment row may name one (PaymentDetail.BankAccountId), and
    /// an account's balance is its opening balance plus the non-voided payment rows into it, minus those out of it, plus
    /// and minus internal transfers (BankAccountTransfer). Nothing stores the running balance; it is always summed.
    /// Soft delete through IsActive: an account with history is deactivated, never removed.
    /// </summary>
    public class BankAccount
    {
        public int Id { get; set; }
        public string Title { get; set; } = null!;
        public BankAccountKindEnum Kind { get; set; }

        /// <summary>BANK only.</summary>
        public string? BankName { get; set; }
        public string? AccountNumber { get; set; }
        public string? CardNumber { get; set; }
        public string? Iban { get; set; }

        /// <summary>What was in the account the day it was set up in this system; its movements start from here.</summary>
        public UInt64 OpeningBalance { get; set; }
        public DateTime OpeningDate { get; set; }

        public string? Description { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}
