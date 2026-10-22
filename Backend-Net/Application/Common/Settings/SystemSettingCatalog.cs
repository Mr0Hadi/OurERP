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

        /// <summary>
        /// Several warehouses (GAP-08). Off: every unit lives in the default warehouse, warehouse choices on requests are ignored,
        /// picking takes any warehouse and new stock transfers are refused. On: receiving/shipping/returns name a warehouse,
        /// transfers move stock between warehouses. Switching never moves or deletes a unit (CLAUDE.md section 6b).
        /// </summary>
        public static readonly SystemSettingDefinition WarehouseMultiWarehouseEnabled = new(
            Key: "Warehouse.MultiWarehouseEnabled",
            Group: SystemSettingGroupEnum.WAREHOUSE,
            Type: SystemSettingTypeEnum.BOOLEAN,
            DefaultValue: "false",
            Title: "چند انبار",
            Description: "روشن: کالا در چند انبار نگه داشته می‌شود؛ دریافت، ارسال و مرجوعی انبار را مشخص می‌کنند و حواله‌ی بین انبار فعال است. خاموش: همه‌چیز در انبار پیش‌فرض است. خاموش‌کردن هیچ کالایی را جابه‌جا یا حذف نمی‌کند؛ کالاهایی که در انبارهای دیگرند سر جایشان می‌مانند و همچنان فروختنی‌اند، و حواله‌های در راه را می‌شود تحویل یا لغو کرد.",
            IsPublic: true);

        /// <summary>Hide the system quantity from the counters while a stocktake is being counted (blind count).</summary>
        public static readonly SystemSettingDefinition StocktakeBlindCount = new(
            Key: "Stocktake.BlindCount",
            Group: SystemSettingGroupEnum.WAREHOUSE,
            Type: SystemSettingTypeEnum.BOOLEAN,
            DefaultValue: "true",
            Title: "شمارش کور در انبارگردانی",
            Description: "روشن: تا وقتی شمارش تمام نشده، موجودی سیستم و مغایرت‌ها به هیچ‌کس نشان داده نمی‌شود تا شمارنده‌ها آنچه را می‌بینند بشمارند؛ پس از اتمام شمارش، مغایرت‌ها برای تأییدکننده نمایش داده می‌شوند.",
            IsPublic: true);

        public static readonly SystemSettingDefinition CompanyName = new(
            Key: "Company.Name", Group: SystemSettingGroupEnum.COMPANY, Type: SystemSettingTypeEnum.TEXT, DefaultValue: "",
            Title: "نام شرکت", Description: "در سربرگ فاکتورها و اسناد چاپی.", MaxLength: 200);
        public static readonly SystemSettingDefinition CompanyNationalId = new(
            Key: "Company.NationalId", Group: SystemSettingGroupEnum.COMPANY, Type: SystemSettingTypeEnum.TEXT, DefaultValue: "",
            Title: "شناسه‌ی ملی", Description: "شناسه‌ی ملی شرکت در سربرگ اسناد.", MaxLength: 20);
        public static readonly SystemSettingDefinition CompanyEconomicCode = new(
            Key: "Company.EconomicCode", Group: SystemSettingGroupEnum.COMPANY, Type: SystemSettingTypeEnum.TEXT, DefaultValue: "",
            Title: "کد اقتصادی", Description: "کد اقتصادی شرکت در سربرگ اسناد.", MaxLength: 20);
        public static readonly SystemSettingDefinition CompanyRegistrationNumber = new(
            Key: "Company.RegistrationNumber", Group: SystemSettingGroupEnum.COMPANY, Type: SystemSettingTypeEnum.TEXT, DefaultValue: "",
            Title: "شماره‌ی ثبت", Description: "شماره‌ی ثبت شرکت در سربرگ اسناد.", MaxLength: 30);
        public static readonly SystemSettingDefinition CompanyAddress = new(
            Key: "Company.Address", Group: SystemSettingGroupEnum.COMPANY, Type: SystemSettingTypeEnum.TEXT, DefaultValue: "",
            Title: "نشانی", Description: "نشانی شرکت در سربرگ اسناد.", MaxLength: 500);
        public static readonly SystemSettingDefinition CompanyPhoneNumber = new(
            Key: "Company.PhoneNumber", Group: SystemSettingGroupEnum.COMPANY, Type: SystemSettingTypeEnum.TEXT, DefaultValue: "",
            Title: "تلفن", Description: "تلفن شرکت در سربرگ اسناد.", MaxLength: 30);
        public static readonly SystemSettingDefinition CompanyPostalCode = new(
            Key: "Company.PostalCode", Group: SystemSettingGroupEnum.COMPANY, Type: SystemSettingTypeEnum.TEXT, DefaultValue: "",
            Title: "کد پستی", Description: "کد پستی شرکت در سربرگ اسناد.", MaxLength: 20);
        public static readonly SystemSettingDefinition CompanyProvince = new(
            Key: "Company.Province", Group: SystemSettingGroupEnum.COMPANY, Type: SystemSettingTypeEnum.TEXT, DefaultValue: "",
            Title: "استان", Description: "استان شرکت در سربرگ اسناد.", MaxLength: 50);
        public static readonly SystemSettingDefinition CompanyCity = new(
            Key: "Company.City", Group: SystemSettingGroupEnum.COMPANY, Type: SystemSettingTypeEnum.TEXT, DefaultValue: "",
            Title: "شهر", Description: "شهر شرکت در سربرگ اسناد.", MaxLength: 50);
        public static readonly SystemSettingDefinition CompanyCurrency = new(
            Key: "Company.Currency", Group: SystemSettingGroupEnum.COMPANY, Type: SystemSettingTypeEnum.TEXT, DefaultValue: "ریال",
            Title: "واحد پول در اسناد", Description: "واحدی که کنار مبلغ‌ها در اسناد چاپی نوشته می‌شود (مبلغ‌ها همیشه ریال ذخیره می‌شوند).", MaxLength: 20);

        public static readonly SystemSettingDefinition SecurityMaxFailedLoginAttempts = new(
            Key: "Security.MaxFailedLoginAttempts",
            Group: SystemSettingGroupEnum.SECURITY,
            Type: SystemSettingTypeEnum.INTEGER,
            DefaultValue: "10",
            Title: "تعداد تلاش ناموفق ورود",
            Description: "پس از این تعداد رمز اشتباه پشت‌سرهم، حساب کاربر برای مدتی قفل می‌شود.",
            MinValue: 3,
            MaxValue: 100,
            Unit: "بار");

        public static readonly SystemSettingDefinition SecurityLockoutMinutes = new(
            Key: "Security.LockoutMinutes",
            Group: SystemSettingGroupEnum.SECURITY,
            Type: SystemSettingTypeEnum.INTEGER,
            DefaultValue: "5",
            Title: "مدت قفل حساب",
            Description: "مدتی که حساب پس از رسیدن به سقف تلاش‌های ناموفق قفل می‌ماند.",
            MinValue: 1,
            MaxValue: 1440,
            Unit: "دقیقه");

        public static readonly IReadOnlyList<SystemSettingDefinition> All = new[]
        {
            SaleReservationMinutes,
            PaymentRequireBankAccount,
            InstallmentOverdueGraceDays,
            InstallmentEarlySettlementDiscountPercentage,
            WarehouseMultiWarehouseEnabled,
            StocktakeBlindCount,
            CompanyName,
            CompanyNationalId,
            CompanyEconomicCode,
            CompanyRegistrationNumber,
            CompanyAddress,
            CompanyPhoneNumber,
            CompanyPostalCode,
            CompanyProvince,
            CompanyCity,
            CompanyCurrency,
            SecurityMaxFailedLoginAttempts,
            SecurityLockoutMinutes,
        };

        public static SystemSettingDefinition? Find(string? key) =>
            key == null ? null : All.FirstOrDefault(x => string.Equals(x.Key, key.Trim(), StringComparison.OrdinalIgnoreCase));
    }
}
