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

        [Description("اسقاط از موجودی")]
        STOCK_SCRAPPED = 12,

        [Description("پذیرش مازاد در خرید")]
        PURCHASE_EXCESS_ACCEPTED = 13,

        [Description("انتقال به قرنطینه")]
        STOCK_QUARANTINED = 14,

        [Description("رزرو برای پیش‌فاکتور")]
        SALE_RESERVED = 15,

        [Description("آزادسازی رزرو پیش‌فاکتور")]
        SALE_RESERVATION_RELEASED = 16,

        [Description("ارسال حواله‌ی بین انبار")]
        STOCK_TRANSFER_DISPATCHED = 17,

        [Description("دریافت حواله‌ی بین انبار")]
        STOCK_TRANSFER_RECEIVED = 18,

        [Description("لغو حواله‌ی بین انبار")]
        STOCK_TRANSFER_CANCELLED = 19,

        /// <summary>A stocktake found the unit missing (IN_STOCK -> SCRAPPED) or added a counted surplus (minted IN_STOCK).</summary>
        [Description("تعدیل انبارگردانی")]
        STOCKTAKE_ADJUSTMENT = 20,

        /// <summary>A stocktake found the unit in a different warehouse than recorded; only its warehouse changed.</summary>
        [Description("جابه‌جایی در انبارگردانی")]
        STOCKTAKE_RELOCATED = 21,
    }
}
