using System.ComponentModel;

namespace Domain.Enums
{
    public enum BalanceTypeEnum
    {
        [Description("طلبکار")]
        Creditor,
        [Description("بدهکار")]
        Debtor,
        [Description("تسویه شده")]
        Balanced
    }
}
