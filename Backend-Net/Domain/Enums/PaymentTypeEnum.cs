using System.ComponentModel;

namespace Domain.Enums
{
    public enum PaymentTypeEnum
    {
        [Description("نقدی")]
        CASH,
        [Description("نسیه")]
        CREDIT,
        [Description("چک")]
        CHECK,
        [Description("انتقال بانکی")]
        TRANSFER,
        [Description("ترکیبی")]
        MIXED,
    }
}
