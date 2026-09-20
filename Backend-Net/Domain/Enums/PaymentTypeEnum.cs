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
        // اقساطی: مبلغ در طول زمان و ماه‌به‌ماه پرداخت می‌شود - برخلاف MIXED که کل مبلغ
        // یکجا ولی با چند روش پرداخت می‌شود. آخر لیست اضافه شده تا شماره‌ی هیچ عضو موجودی عوض نشود.
        [Description("اقساطی")]
        INSTALLMENT,
    }
}
