using System.ComponentModel;

namespace Domain.Enums
{
    /// <summary>
    /// Side of a party-ledger row. A party's balance is the sum of DEBIT minus the sum of CREDIT: positive means the
    /// party owes us, negative means we owe the party - the same reading for a customer and for a supplier.
    /// Starts at 1 so an unset value is caught.
    /// </summary>
    public enum PartyLedgerDirectionEnum
    {
        [Description("بدهکار")]
        DEBIT = 1,

        [Description("بستانکار")]
        CREDIT = 2,
    }
}
