namespace Domain.Entities
{
    /// <summary>
    /// Money moved between two of our own accounts (cash box to bank, bank to bank). Not a payment: no party, no party-ledger
    /// row. Never edited or deleted: a mistake is voided (VoidedAt) and recorded again.
    /// </summary>
    public class BankAccountTransfer
    {
        public int Id { get; set; }

        public int FromBankAccountId { get; set; }
        public BankAccount FromBankAccount { get; set; } = null!;

        public int ToBankAccountId { get; set; }
        public BankAccount ToBankAccount { get; set; } = null!;

        public UInt64 Amount { get; set; }
        public DateTime TransferredAt { get; set; }
        public string? TransferRef { get; set; }
        public string? Description { get; set; }

        public DateTime? VoidedAt { get; set; }
        public DateTime RecordedAt { get; set; }
        public int? RecordedByUserId { get; set; }
    }
}
