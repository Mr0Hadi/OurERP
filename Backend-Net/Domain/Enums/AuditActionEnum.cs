using System.ComponentModel;

namespace Domain.Enums
{
    /// <summary>
    /// The command behind an AuditEvent - one member per MediatR command, attached with [AuditAction] on the command
    /// class. This enum IS the catalogue of event types: there is deliberately no lookup table, the same decision as
    /// PermissionEnum (an event type no command writes means nothing). AuditActionCoverageTests fails when a command has
    /// no member, when a query has one, or when two commands share one.
    ///
    /// Persisted in AuditEvents.Action: per CLAUDE.md section 7, NEVER renumber and never reuse a retired number.
    /// Each group starts at a round number with room to grow.
    /// </summary>
    public enum AuditActionEnum
    {
        // --- حساب کاربری ---
        [Description("ورود به سامانه")]
        Login = 1,

        [Description("خروج از سامانه")]
        Logout = 2,

        [Description("خاتمه‌ی نشست کاربر")]
        LogoutUserById = 3,

        [Description("تمدید نشست")]
        RefreshToken = 4,

        [Description("تغییر رمز عبور")]
        ChangePassword = 5,

        // --- کاربران و دسترسی‌ها ---
        [Description("ایجاد کاربر")]
        CreateUser = 20,

        [Description("ویرایش کاربر")]
        UpdateUser = 21,

        [Description("ویرایش اطلاعات شخصی")]
        UpdateUserInfo = 22,

        [Description("حذف کاربر")]
        DeleteUser = 23,

        [Description("تغییر تیم کاربر")]
        ChangeUserTeam = 24,

        [Description("بازنشانی رمز عبور کاربر")]
        ResetUserPassword = 25,

        [Description("ویرایش دسترسی‌های کاربر")]
        UpdateUserPermissions = 26,

        // --- ساختار سازمانی ---
        [Description("ایجاد واحد")]
        CreateDepartment = 40,

        [Description("ویرایش واحد")]
        UpdateDepartment = 41,

        [Description("حذف واحد")]
        DeleteDepartment = 42,

        [Description("ویرایش الگوی دسترسی واحد")]
        UpdateDepartmentPermissionTemplate = 43,

        [Description("ایجاد تیم")]
        CreateTeam = 44,

        [Description("ویرایش تیم")]
        UpdateTeam = 45,

        [Description("حذف تیم")]
        DeleteTeam = 46,

        // --- اطلاعات پایه ---
        [Description("ایجاد مشتری")]
        CreateCustomer = 100,

        [Description("ویرایش مشتری")]
        UpdateCustomer = 101,

        [Description("حذف مشتری")]
        DeleteCustomer = 102,

        [Description("ایجاد تأمین‌کننده")]
        CreateSupplier = 110,

        [Description("ویرایش تأمین‌کننده")]
        UpdateSupplier = 111,

        [Description("حذف تأمین‌کننده")]
        DeleteSupplier = 112,

        [Description("ایجاد کالا")]
        CreateProduct = 120,

        [Description("ویرایش کالا")]
        UpdateProduct = 121,

        [Description("حذف کالا")]
        DeleteProduct = 122,

        [Description("ایجاد دسته‌بندی کالا")]
        CreateProductCategory = 130,

        [Description("ویرایش دسته‌بندی کالا")]
        UpdateProductCategory = 131,

        [Description("حذف دسته‌بندی کالا")]
        DeleteProductCategory = 132,

        [Description("ایجاد خودرو")]
        CreateVehicle = 140,

        [Description("ویرایش خودرو")]
        UpdateVehicle = 141,

        [Description("حذف خودرو")]
        DeleteVehicle = 142,

        [Description("افزودن کالا به خودرو")]
        AddProductsToVehicle = 143,

        [Description("حذف کالا از خودرو")]
        RemoveProductFromVehicle = 144,

        [Description("بارگذاری فایل")]
        UploadImage = 150,

        [Description("حذف فایل")]
        DeleteImage = 151,

        [Description("ورود اطلاعات از فایل")]
        ImportData = 160,

        // --- خرید ---
        [Description("ایجاد خرید")]
        CreatePurchase = 200,

        [Description("ویرایش پیش‌فاکتور خرید")]
        UpdatePurchase = 201,

        [Description("حذف خرید")]
        DeletePurchase = 202,

        [Description("تغییر وضعیت خرید")]
        ChangePurchaseStatus = 203,

        [Description("ویرایش پیوست‌های خرید")]
        UpdatePurchaseAttachments = 204,

        [Description("ویرایش مهلت پرداخت خرید")]
        UpdatePurchasePaymentDate = 205,

        [Description("ثبت پرداخت خرید")]
        AddPurchasePayment = 206,

        [Description("اصلاح پرداخت خرید")]
        EditPurchasePayment = 207,

        [Description("ابطال پرداخت خرید")]
        VoidPurchasePayment = 208,

        [Description("دریافت کالای خرید")]
        ReceivePurchase = 209,

        [Description("بستن ردیف خرید")]
        ClosePurchaseItem = 210,

        [Description("بازگشایی ردیف خرید")]
        ReopenPurchaseItem = 211,

        [Description("خرید کالای مازاد")]
        AcceptPurchaseExcess = 212,

        // --- مرجوعی خرید ---
        [Description("ایجاد مرجوعی خرید")]
        CreatePurchaseReturn = 300,

        [Description("حذف مرجوعی خرید")]
        DeletePurchaseReturn = 301,

        [Description("لغو مرجوعی خرید")]
        CancelPurchaseReturn = 302,

        [Description("رد مرجوعی خرید")]
        RejectPurchaseReturn = 303,

        [Description("بازگشایی مرجوعی خرید")]
        ReopenPurchaseReturn = 304,

        [Description("ثبت تصمیم مرجوعی خرید")]
        AddPurchaseReturnResolution = 305,

        [Description("حذف تصمیم مرجوعی خرید")]
        RemovePurchaseReturnResolution = 306,

        [Description("اجرای جابه‌جایی کالای مرجوعی خرید")]
        ExecutePurchaseReturnGoodsRound = 307,

        [Description("ثبت پرداخت مرجوعی خرید")]
        ExecutePurchaseReturnMoneyEffect = 308,

        [Description("ویرایش پیوست‌های مرجوعی خرید")]
        UpdatePurchaseReturnAttachments = 309,

        // --- فروش ---
        [Description("ایجاد فروش")]
        CreateSale = 400,

        [Description("ویرایش پیش‌فاکتور فروش")]
        UpdateSale = 401,

        [Description("حذف فروش")]
        DeleteSale = 402,

        [Description("تغییر وضعیت فروش")]
        ChangeSaleStatus = 403,

        [Description("ویرایش پیوست‌های فروش")]
        UpdateSaleAttachments = 404,

        [Description("ویرایش مهلت پرداخت فروش")]
        UpdateSalePaymentDate = 405,

        [Description("ثبت دریافت فروش")]
        AddSalePayment = 406,

        [Description("اصلاح دریافت فروش")]
        EditSalePayment = 407,

        [Description("ابطال دریافت فروش")]
        VoidSalePayment = 408,

        [Description("ارسال کالای فروش")]
        ShipSale = 409,

        [Description("تکمیل فروش حضوری")]
        CompleteInPersonSale = 410,

        [Description("تأیید مشتری روی پیش‌فاکتور")]
        ApproveSaleProforma = 411,

        [Description("تأیید انبار و رزرو کالای پیش‌فاکتور")]
        CheckSaleWarehouse = 412,

        [Description("رسیدگی به گزارش انبار")]
        ResolveSaleWarehouseIssue = 413,

        [Description("پایان مهلت رزرو پیش‌فاکتور")]
        ReleaseExpiredSaleReservation = 414,

        [Description("ثبت پیش‌فاکتور حضوری و رزرو کالا")]
        CreateInPersonProforma = 415,

        [Description("آزادسازی دستی رزرو پیش‌فاکتور")]
        ReleaseSaleReservation = 416,

        // --- اقساط ---
        [Description("ایجاد طرح اقساط")]
        CreateSaleInstallmentPlan = 500,

        [Description("ویرایش طرح اقساط")]
        UpdateSaleInstallmentPlan = 501,

        [Description("حذف طرح اقساط")]
        DeleteSaleInstallmentPlan = 502,

        [Description("پرداخت قسط")]
        PaySaleInstallment = 503,

        [Description("تسویه‌ی طرح اقساط")]
        SettleSaleInstallmentPlan = 504,

        [Description("علامت‌گذاری اقساط سررسیدگذشته")]
        MarkOverdueSaleInstallments = 505,

        [Description("بخشودگی جریمه‌ی دیرکرد قسط")]
        WaiveSaleInstallmentPenalty = 506,

        // --- مرجوعی فروش ---
        [Description("ایجاد مرجوعی فروش")]
        CreateSaleReturn = 600,

        [Description("حذف مرجوعی فروش")]
        DeleteSaleReturn = 601,

        [Description("لغو مرجوعی فروش")]
        CancelSaleReturn = 602,

        [Description("رد مرجوعی فروش")]
        RejectSaleReturn = 603,

        [Description("بازگشایی مرجوعی فروش")]
        ReopenSaleReturn = 604,

        [Description("ثبت تصمیم مرجوعی فروش")]
        AddSaleReturnResolution = 605,

        [Description("حذف تصمیم مرجوعی فروش")]
        RemoveSaleReturnResolution = 606,

        [Description("اجرای جابه‌جایی کالای مرجوعی فروش")]
        ExecuteSaleReturnGoodsRound = 607,

        [Description("ثبت پرداخت مرجوعی فروش")]
        ExecuteSaleReturnMoneyEffect = 608,

        [Description("ویرایش پیوست‌های مرجوعی فروش")]
        UpdateSaleReturnAttachments = 609,

        // --- محموله ---
        [Description("دریافت محموله")]
        ReceiveShipment = 700,

        [Description("ارسال محموله")]
        DispatchShipment = 701,

        // --- انبار ---
        [Description("اقدام روی واحد کالا")]
        ApplyProductUnitAction = 800,

        [Description("ثبت چاپ برچسب")]
        MarkProductUnitsPrinted = 801,

        [Description("تعیین محل قفسه")]
        SetProductUnitLocation = 802,

        [Description("تکمیل کد کالاها")]
        EnsureProductCodes = 803,

        [Description("تکمیل دفتر بهای موجودی")]
        EnsureInventoryCostLedger = 804,

        [Description("ایجاد انبار")]
        CreateWarehouse = 805,

        [Description("ویرایش انبار")]
        UpdateWarehouse = 806,

        [Description("حذف انبار")]
        DeleteWarehouse = 807,

        [Description("ثبت حواله‌ی بین انبار")]
        CreateStockTransfer = 808,

        [Description("تحویل حواله‌ی بین انبار")]
        ReceiveStockTransfer = 809,

        [Description("لغو حواله‌ی بین انبار")]
        CancelStockTransfer = 810,

        [Description("ایجاد انبارگردانی")]
        CreateStocktake = 811,

        [Description("ثبت شمارش دستی انبارگردانی")]
        CountStocktakeLine = 812,

        [Description("اسکن انبارگردانی")]
        ScanStocktakeUnits = 813,

        [Description("حذف اسکن انبارگردانی")]
        RemoveStocktakeScan = 814,

        [Description("پایان شمارش انبارگردانی")]
        SubmitStocktake = 815,

        [Description("بازگشایی شمارش انبارگردانی")]
        ReopenStocktake = 816,

        [Description("تأیید انبارگردانی")]
        ApproveStocktake = 817,

        [Description("لغو انبارگردانی")]
        CancelStocktake = 818,

        [Description("ساخت پیش‌فاکتور خرید از پیشنهاد خرید")]
        CreatePurchaseDraftsFromReorder = 819,

        // --- کارت‌خوان ---
        [Description("پرداخت با کارت‌خوان")]
        ChargePos = 900,

        [Description("ایجاد کارت‌خوان")]
        CreatePosTerminal = 901,

        [Description("ویرایش کارت‌خوان")]
        UpdatePosTerminal = 902,

        [Description("حذف کارت‌خوان")]
        DeletePosTerminal = 903,

        // --- تنظیمات سامانه ---
        [Description("ویرایش تنظیمات سامانه")]
        UpdateSystemSettings = 1000,

        // --- صندوق و بانک ---
        [Description("ایجاد صندوق/حساب بانکی")]
        CreateBankAccount = 1100,

        [Description("ویرایش صندوق/حساب بانکی")]
        UpdateBankAccount = 1101,

        [Description("حذف صندوق/حساب بانکی")]
        DeleteBankAccount = 1102,

        [Description("انتقال بین حساب‌ها")]
        TransferBetweenBankAccounts = 1103,

        [Description("ابطال انتقال بین حساب‌ها")]
        VoidBankAccountTransfer = 1104,

        // --- دریافت و پرداخت علی‌الحساب ---
        [Description("ثبت دریافت/پرداخت علی‌الحساب")]
        AddPartyPayment = 1110,

        [Description("تخصیص دریافت/پرداخت به فاکتور")]
        AllocatePartyPayment = 1111,

        [Description("حذف تخصیص دریافت/پرداخت")]
        RemovePartyPaymentAllocation = 1112,

        [Description("ابطال دریافت/پرداخت علی‌الحساب")]
        VoidPartyPayment = 1113,

        // --- چک ---
        [Description("وصول چک")]
        CashCheck = 1120,

        [Description("برگشت چک")]
        BounceCheck = 1121,

        [Description("خرج چک")]
        EndorseCheck = 1122,
    }
}
