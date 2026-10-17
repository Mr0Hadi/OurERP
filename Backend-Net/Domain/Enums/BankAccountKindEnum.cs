using System.ComponentModel;

namespace Domain.Enums
{
    /// <summary>What a BankAccount row is. Persisted and a frontend contract: explicit values, append only, never renumber.</summary>
    public enum BankAccountKindEnum
    {
        [Description("صندوق")]
        CASH_BOX = 1,

        [Description("حساب بانکی")]
        BANK = 2,
    }
}
