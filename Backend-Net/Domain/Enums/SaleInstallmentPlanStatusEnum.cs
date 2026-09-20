using System.ComponentModel;

namespace Domain.Enums
{
    /// <summary>وضعیت قرارداد اقساطی یک فروش.</summary>
    public enum SaleInstallmentPlanStatusEnum
    {
        [Description("جاری")]
        ACTIVE = 0,
        [Description("تسویه شده")]
        SETTLED = 1,
        [Description("ابطال شده")]
        CANCELLED = 2,
    }
}
