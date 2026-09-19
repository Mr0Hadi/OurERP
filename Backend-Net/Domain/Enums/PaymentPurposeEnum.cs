using System.ComponentModel;

namespace Domain.Enums
{
    /// <summary>
    /// «این پرداخت چیست» - در برابر <see cref="PaymentTypeEnum"/> که می‌گوید «چطور پرداخت شد»
    /// (نقد/چک/انتقال). این دو محور مستقل‌اند و نباید با هم قاطی شوند.
    /// </summary>
    public enum PaymentPurposeEnum
    {
        [Description("پرداخت عادی")]
        NORMAL = 0,
        [Description("پیش‌پرداخت قرارداد اقساطی")]
        INSTALLMENT_DOWN_PAYMENT = 1,
        [Description("پرداخت قسط")]
        INSTALLMENT = 2,
    }
}
