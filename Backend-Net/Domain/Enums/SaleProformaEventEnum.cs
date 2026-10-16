using System.ComponentModel;

namespace Domain.Enums
{
    /// <summary>What a SaleProformaStageEvent row records. Persisted as an int: append with explicit values, never renumber.</summary>
    public enum SaleProformaEventEnum
    {
        [Description("تأیید مشتری")]
        CUSTOMER_APPROVED = 1,

        [Description("تأیید انبار")]
        WAREHOUSE_CHECKED = 2,

        [Description("کسری در انبار")]
        WAREHOUSE_SHORTAGE = 3,

        [Description("بازگشت به پیش‌نویس به‌خاطر ویرایش")]
        RESET_BY_EDIT = 4,
    }
}
