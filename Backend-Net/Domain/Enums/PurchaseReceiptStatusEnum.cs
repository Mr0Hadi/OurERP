using System.ComponentModel;

namespace Domain.Enums
{
    public enum PurchaseReceiptStatusEnum
    {
        [Description("در حال دریافت")]
        RECEIVING,
        [Description("دارای مغایرت")]
        DISCREPANCY_OPEN,
        [Description("تکمیل شده")]
        COMPLETED,
    }
}
