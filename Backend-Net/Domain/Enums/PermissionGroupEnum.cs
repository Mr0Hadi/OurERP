using System.ComponentModel;

namespace Domain.Enums
{
    /// <summary>
    /// Display grouping for <see cref="PermissionEnum"/> - the sections the admin's
    /// permission screen renders. Carries no authorization meaning of its own: a group is
    /// never granted, only the individual permissions inside it are.
    /// </summary>
    public enum PermissionGroupEnum
    {
        [Description("مدیریت کاربران و دسترسی‌ها")]
        UserManagement = 1,

        [Description("ساختار سازمانی")]
        OrgStructure = 2,

        [Description("اطلاعات پایه")]
        BasicData = 3,

        [Description("خرید")]
        Purchase = 4,

        [Description("فروش")]
        Sale = 5,

        [Description("اقساط")]
        Installment = 6,

        [Description("مرجوعی خرید")]
        PurchaseReturn = 7,

        [Description("مرجوعی فروش")]
        SaleReturn = 8,

        [Description("انبار")]
        Warehouse = 9,

        [Description("اسناد و چاپ")]
        Documents = 10,

        [Description("گزارش‌ها")]
        Reports = 11,

        [Description("کارت‌خوان")]
        Pos = 12,

        [Description("حساب اشخاص")]
        PartyAccounts = 13
    }
}
