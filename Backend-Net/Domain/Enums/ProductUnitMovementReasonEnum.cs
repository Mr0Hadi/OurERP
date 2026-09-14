using System.ComponentModel;

namespace Domain.Enums
{
    /// <summary>
    /// Why a ProductUnitMovement happened. Persisted as an int: members are appended with explicit values and
    /// never renumbered.
    /// </summary>
    public enum ProductUnitMovementReasonEnum
    {
        [Description("موجودی اولیه")]
        OPENING_BALANCE = 1,

        [Description("اصلاح دستی موجودی")]
        MANUAL_ADJUSTMENT = 2,

        [Description("دریافت از تامین‌کننده")]
        PURCHASE_RECEIVED = 3,

        [Description("ارسال به مشتری")]
        SALE_SHIPPED = 4,

        [Description("دریافت کالا در مرجوعی خرید")]
        PURCHASE_RETURN_RECEIVED = 5,

        [Description("عودت به تامین‌کننده")]
        PURCHASE_RETURN_SHIPPED = 6,

        [Description("دریافت کالا در مرجوعی فروش")]
        SALE_RETURN_RECEIVED = 7,

        [Description("ارسال کالا در مرجوعی فروش")]
        SALE_RETURN_SHIPPED = 8,

        [Description("آزادسازی از قرنطینه")]
        QUARANTINE_RELEASED = 9,

        [Description("اسقاط از قرنطینه")]
        QUARANTINE_SCRAPPED = 10,

        [Description("ارسال مازاد به مشتری")]
        SALE_SHIPPED_EXCESS = 11,
    }
}
