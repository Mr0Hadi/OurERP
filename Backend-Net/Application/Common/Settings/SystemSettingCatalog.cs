using Domain.Enums;

namespace Application.Common.Settings
{
    /// <summary>
    /// Every system setting that exists. Adding one = a new field here plus the code that reads it, through
    /// ISystemSettingService. Keys are persisted and are a frontend contract: never rename or reuse one.
    /// </summary>
    public static class SystemSettingCatalog
    {
        /// <summary>
        /// How long the warehouse's reservation of a proforma's units is held while waiting for the customer's payment.
        /// 0 = never expires. Applies to reservations made after the change; one already running keeps its own deadline.
        /// </summary>
        public static readonly SystemSettingDefinition SaleReservationMinutes = new(
            Key: "Sale.ReservationMinutes",
            Group: SystemSettingGroupEnum.SALE,
            Type: SystemSettingTypeEnum.INTEGER,
            DefaultValue: "10",
            Title: "مهلت رزرو کالای پیش‌فاکتور",
            Description: "پس از تأیید انبار، کالای پیش‌فاکتور تا این مدت برای پرداخت مشتری نگه داشته می‌شود و بعد به موجودی آزاد برمی‌گردد. صفر یعنی رزرو منقضی نمی‌شود. تغییر این مقدار فقط روی رزروهای بعدی اثر دارد.",
            MinValue: 0,
            MaxValue: 10080,
            Unit: "دقیقه");

        /// <summary>
        /// Whether every new receipt/payment must name the cash box or bank account it went through. Off by default so existing
        /// screens keep working; turn it on once the frontend sends the account everywhere. CREDIT rows are exempt (no money moves).
        /// </summary>
        public static readonly SystemSettingDefinition PaymentRequireBankAccount = new(
            Key: "Payment.RequireBankAccount",
            Group: SystemSettingGroupEnum.PAYMENT,
            Type: SystemSettingTypeEnum.BOOLEAN,
            DefaultValue: "false",
            Title: "الزام انتخاب صندوق/حساب بانکی",
            Description: "اگر روشن باشد، هر دریافت و پرداخت تازه باید صندوق یا حساب بانکی‌ای را که پول از آن گذشته مشخص کند (به جز ردیف نسیه). پرداخت کارتخوانی که دستگاهش به حسابی وصل است خودکار همان حساب را می‌گیرد.");

        /// <summary>Days after its due date before an unpaid installment counts as late: marked OVERDUE, and penalised.</summary>
        public static readonly SystemSettingDefinition InstallmentOverdueGraceDays = new(
            Key: "Installment.OverdueGraceDays",
            Group: SystemSettingGroupEnum.INSTALLMENT,
            Type: SystemSettingTypeEnum.INTEGER,
            DefaultValue: "0",
            Title: "مهلت ارفاق پس از سررسید قسط",
            Description: "قسطی که تا این تعداد روز پس از سررسید پرداخت نشود «سررسیدگذشته» می‌شود و جریمه‌ی دیرکردش از روز بعد از این مهلت حساب می‌شود.",
            MinValue: 0,
            MaxValue: 60,
            Unit: "روز");

        /// <summary>How much of the installment charge on rows not yet due is forgiven when a plan is settled early.</summary>
        public static readonly SystemSettingDefinition InstallmentEarlySettlementDiscountPercentage = new(
            Key: "Installment.EarlySettlementDiscountPercentage",
            Group: SystemSettingGroupEnum.INSTALLMENT,
            Type: SystemSettingTypeEnum.INTEGER,
            DefaultValue: "100",
            Title: "تخفیف تسویه‌ی زودهنگام اقساط",
            Description: "در تسویه‌ی یکجای قرارداد، این درصد از سود اقساطِ قسط‌هایی که هنوز سررسیدشان نرسیده بخشیده می‌شود. ۱۰۰ یعنی سود اقساط آینده کامل برمی‌گردد، صفر یعنی تخفیفی در کار نیست.",
            MinValue: 0,
            MaxValue: 100,
            Unit: "درصد");

        public static readonly IReadOnlyList<SystemSettingDefinition> All = new[]
        {
            SaleReservationMinutes,
            PaymentRequireBankAccount,
            InstallmentOverdueGraceDays,
            InstallmentEarlySettlementDiscountPercentage,
        };

        public static SystemSettingDefinition? Find(string? key) =>
            key == null ? null : All.FirstOrDefault(x => string.Equals(x.Key, key.Trim(), StringComparison.OrdinalIgnoreCase));
    }
}
