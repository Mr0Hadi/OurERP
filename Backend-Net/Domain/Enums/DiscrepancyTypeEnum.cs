using System.ComponentModel;

namespace Domain.Enums
{
    public enum DiscrepancyTypeEnum
    {
        [Description("کمبود کالا")]
        SHORT_DELIVERY,
        [Description("کالای اشتباه")]
        WRONG_ITEM_SENT,
        [Description("آسیب‌دیدگی")]
        DAMAGED,
        [Description("انقضای تاریخ")]
        EXPIRED,
        [Description("مازاد بر سفارش")]
        OVER_DELIVERY,
    }
}
