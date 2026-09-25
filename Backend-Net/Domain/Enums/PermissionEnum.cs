using System.ComponentModel;

namespace Domain.Enums
{
    /// <summary>
    /// Every action a user can be granted the right to call. This enum IS the catalogue - there
    /// is deliberately no Permissions table to seed and keep in sync, because a permission with
    /// no code guarding it is meaningless, so one could never be added from a UI anyway. The
    /// permission screen lists these members; <c>UserPermissions</c> only stores which of them a
    /// user holds.
    ///
    /// The integer values are persisted in <c>UserPermissions.Permission</c> and are part of the
    /// frontend wire contract, so per CLAUDE.md section 7 they must NEVER be renumbered and a
    /// retired member's number must never be reused. Values are spelled out explicitly and each
    /// group starts at a round number with room to grow, so a new permission is appended inside
    /// its group without touching anything else.
    ///
    /// Granularity is per business decision, not per endpoint: several endpoints may share one
    /// permission (a composite command requires the permission of the work it does), and a single
    /// controller may spread across several (executing a goods round is not the same decision as
    /// cancelling a return).
    /// </summary>
    public enum PermissionEnum
    {
        // --- مدیریت کاربران و دسترسی‌ها ---
        [PermissionGroup(PermissionGroupEnum.UserManagement)]
        [Description("مشاهده لیست کاربران")]
        UserView = 1,

        [PermissionGroup(PermissionGroupEnum.UserManagement)]
        [Description("ایجاد کاربر")]
        UserCreate = 2,

        [PermissionGroup(PermissionGroupEnum.UserManagement)]
        [Description("ویرایش کاربر")]
        UserUpdate = 3,

        [PermissionGroup(PermissionGroupEnum.UserManagement)]
        [Description("حذف کاربر")]
        UserDelete = 4,

        [PermissionGroup(PermissionGroupEnum.UserManagement)]
        [Description("مشاهده دسترسی‌های کاربران")]
        PermissionView = 5,

        [PermissionGroup(PermissionGroupEnum.UserManagement)]
        [Description("مدیریت دسترسی‌های کاربران")]
        PermissionManage = 6,

        // --- ساختار سازمانی ---
        [PermissionGroup(PermissionGroupEnum.OrgStructure)]
        [Description("مشاهده دپارتمان‌ها")]
        DepartmentView = 20,

        [PermissionGroup(PermissionGroupEnum.OrgStructure)]
        [Description("مدیریت دپارتمان‌ها")]
        DepartmentManage = 21,

        [PermissionGroup(PermissionGroupEnum.OrgStructure)]
        [Description("مشاهده تیم‌ها")]
        TeamView = 22,

        [PermissionGroup(PermissionGroupEnum.OrgStructure)]
        [Description("مدیریت تیم‌ها")]
        TeamManage = 23,

        // --- اطلاعات پایه ---
        [PermissionGroup(PermissionGroupEnum.BasicData)]
        [Description("مشاهده کالاها")]
        ProductView = 40,

        [PermissionGroup(PermissionGroupEnum.BasicData)]
        [Description("ایجاد کالا")]
        ProductCreate = 41,

        [PermissionGroup(PermissionGroupEnum.BasicData)]
        [Description("ویرایش کالا")]
        ProductUpdate = 42,

        [PermissionGroup(PermissionGroupEnum.BasicData)]
        [Description("حذف کالا")]
        ProductDelete = 43,

        [PermissionGroup(PermissionGroupEnum.BasicData)]
        [Description("مشاهده دسته‌بندی کالا")]
        ProductCategoryView = 44,

        [PermissionGroup(PermissionGroupEnum.BasicData)]
        [Description("مدیریت دسته‌بندی کالا")]
        ProductCategoryManage = 45,

        [PermissionGroup(PermissionGroupEnum.BasicData)]
        [Description("مشاهده مشتریان")]
        CustomerView = 46,

        [PermissionGroup(PermissionGroupEnum.BasicData)]
        [Description("ایجاد مشتری")]
        CustomerCreate = 47,

        [PermissionGroup(PermissionGroupEnum.BasicData)]
        [Description("ویرایش مشتری")]
        CustomerUpdate = 48,

        [PermissionGroup(PermissionGroupEnum.BasicData)]
        [Description("حذف مشتری")]
        CustomerDelete = 49,

        [PermissionGroup(PermissionGroupEnum.BasicData)]
        [Description("مشاهده تأمین‌کنندگان")]
        SupplierView = 50,

        [PermissionGroup(PermissionGroupEnum.BasicData)]
        [Description("ایجاد تأمین‌کننده")]
        SupplierCreate = 51,

        [PermissionGroup(PermissionGroupEnum.BasicData)]
        [Description("ویرایش تأمین‌کننده")]
        SupplierUpdate = 52,

        [PermissionGroup(PermissionGroupEnum.BasicData)]
        [Description("حذف تأمین‌کننده")]
        SupplierDelete = 53,

        // --- خرید ---
        [PermissionGroup(PermissionGroupEnum.Purchase)]
        [Description("مشاهده خریدها")]
        PurchaseView = 70,

        [PermissionGroup(PermissionGroupEnum.Purchase)]
        [Description("ثبت خرید")]
        PurchaseCreate = 71,

        [PermissionGroup(PermissionGroupEnum.Purchase)]
        [Description("ویرایش خرید")]
        PurchaseUpdate = 72,

        [PermissionGroup(PermissionGroupEnum.Purchase)]
        [Description("حذف خرید")]
        PurchaseDelete = 73,

        [PermissionGroup(PermissionGroupEnum.Purchase)]
        [Description("دریافت کالا در انبار")]
        PurchaseReceive = 74,

        [PermissionGroup(PermissionGroupEnum.Purchase)]
        [Description("بستن و بازکردن ردیف خرید")]
        PurchaseItemClose = 75,

        [PermissionGroup(PermissionGroupEnum.Purchase)]
        [Description("خرید کالای مازاد")]
        PurchaseAcceptExcess = 76,

        [PermissionGroup(PermissionGroupEnum.Purchase)]
        [Description("ثبت و ابطال پرداخت خرید")]
        PurchasePayment = 77,

        // --- فروش ---
        [PermissionGroup(PermissionGroupEnum.Sale)]
        [Description("مشاهده فروش‌ها")]
        SaleView = 90,

        [PermissionGroup(PermissionGroupEnum.Sale)]
        [Description("ثبت فروش")]
        SaleCreate = 91,

        [PermissionGroup(PermissionGroupEnum.Sale)]
        [Description("ویرایش فروش")]
        SaleUpdate = 92,

        [PermissionGroup(PermissionGroupEnum.Sale)]
        [Description("حذف فروش")]
        SaleDelete = 93,

        [PermissionGroup(PermissionGroupEnum.Sale)]
        [Description("ارسال کالا به مشتری")]
        SaleShip = 94,

        [PermissionGroup(PermissionGroupEnum.Sale)]
        [Description("فروش حضوری")]
        SaleInPerson = 95,

        [PermissionGroup(PermissionGroupEnum.Sale)]
        [Description("ثبت و ابطال پرداخت فروش")]
        SalePayment = 96,

        // --- اقساط ---
        [PermissionGroup(PermissionGroupEnum.Installment)]
        [Description("مشاهده اقساط")]
        SaleInstallmentView = 110,

        [PermissionGroup(PermissionGroupEnum.Installment)]
        [Description("مدیریت قرارداد اقساطی")]
        SaleInstallmentManage = 111,

        [PermissionGroup(PermissionGroupEnum.Installment)]
        [Description("دریافت قسط")]
        SaleInstallmentPay = 112,

        // --- مرجوعی خرید ---
        [PermissionGroup(PermissionGroupEnum.PurchaseReturn)]
        [Description("مشاهده مرجوعی خرید")]
        PurchaseReturnView = 130,

        [PermissionGroup(PermissionGroupEnum.PurchaseReturn)]
        [Description("ثبت مرجوعی خرید")]
        PurchaseReturnCreate = 131,

        [PermissionGroup(PermissionGroupEnum.PurchaseReturn)]
        [Description("ثبت تصمیم مرجوعی خرید")]
        PurchaseReturnDecide = 132,

        [PermissionGroup(PermissionGroupEnum.PurchaseReturn)]
        [Description("اجرای اثرهای مرجوعی خرید")]
        PurchaseReturnExecute = 133,

        [PermissionGroup(PermissionGroupEnum.PurchaseReturn)]
        [Description("ابطال، رد و بازگشایی مرجوعی خرید")]
        PurchaseReturnLifecycle = 134,

        // --- مرجوعی فروش ---
        [PermissionGroup(PermissionGroupEnum.SaleReturn)]
        [Description("مشاهده مرجوعی فروش")]
        SaleReturnView = 150,

        [PermissionGroup(PermissionGroupEnum.SaleReturn)]
        [Description("ثبت مرجوعی فروش")]
        SaleReturnCreate = 151,

        [PermissionGroup(PermissionGroupEnum.SaleReturn)]
        [Description("ثبت تصمیم مرجوعی فروش")]
        SaleReturnDecide = 152,

        [PermissionGroup(PermissionGroupEnum.SaleReturn)]
        [Description("اجرای اثرهای مرجوعی فروش")]
        SaleReturnExecute = 153,

        [PermissionGroup(PermissionGroupEnum.SaleReturn)]
        [Description("ابطال، رد و بازگشایی مرجوعی فروش")]
        SaleReturnLifecycle = 154,

        // --- انبار ---
        [PermissionGroup(PermissionGroupEnum.Warehouse)]
        [Description("مشاهده واحدهای کالا و تاریخچه آن‌ها")]
        ProductUnitView = 170,

        [PermissionGroup(PermissionGroupEnum.Warehouse)]
        [Description("عملیات نگهداشت انبار")]
        InventoryMaintenance = 171,

        // --- اسناد و چاپ ---
        [PermissionGroup(PermissionGroupEnum.Documents)]
        [Description("بارگذاری فایل و تصویر")]
        FileUpload = 190,

        [PermissionGroup(PermissionGroupEnum.Documents)]
        [Description("حذف فایل و تصویر")]
        FileDelete = 191,

        [PermissionGroup(PermissionGroupEnum.Documents)]
        [Description("چاپ فاکتور")]
        InvoicePrint = 192,

        [PermissionGroup(PermissionGroupEnum.Documents)]
        [Description("چاپ بارکد و برچسب")]
        BarcodePrint = 193,

        // --- گزارش‌ها ---
        [PermissionGroup(PermissionGroupEnum.Reports)]
        [Description("مشاهده گزارش‌ها")]
        ReportView = 210,

        // --- کارت‌خوان ---
        [PermissionGroup(PermissionGroupEnum.Pos)]
        [Description("دریافت وجه با کارت‌خوان")]
        PosCharge = 230,

        [PermissionGroup(PermissionGroupEnum.Pos)]
        [Description("مشاهده کارت‌خوان‌ها")]
        PosTerminalView = 231,

        [PermissionGroup(PermissionGroupEnum.Pos)]
        [Description("مدیریت کارت‌خوان‌ها")]
        PosTerminalManage = 232,

        // --- حساب اشخاص ---
        [PermissionGroup(PermissionGroupEnum.PartyAccounts)]
        [Description("مشاهده گردش حساب مشتریان و تامین‌کنندگان")]
        PartyStatementView = 250
    }
}
