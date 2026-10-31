using System.ComponentModel;

namespace Domain.Enums
{
    /// <summary>What a SaleProformaStageEvent row records. Persisted as an int: append with explicit values, never renumber.</summary>
    public enum SaleProformaEventEnum
    {
        [Description("تأیید مشتری")]
        CUSTOMER_APPROVED = 1,

        [Description("تأیید انبار")]
        WAREHOUSE_CHECKED = 2,

        [Description("کسری در انبار")]
        WAREHOUSE_SHORTAGE = 3,

        [Description("بازگشت به پیش‌نویس به‌خاطر ویرایش")]
        RESET_BY_EDIT = 4,

        [Description("پایان مهلت رزرو")]
        RESERVATION_EXPIRED = 5,

        /// <summary>The warehouse lowered (or removed) lines and approved the rest in one step; the note names before and after.</summary>
        [Description("اصلاح و تأیید انبار")]
        WAREHOUSE_ADJUSTED = 6,

        /// <summary>A user put the reserved units back on the shelf before the deadline (ReleaseSaleReservation).</summary>
        [Description("آزادسازی دستی رزرو")]
        RESERVATION_RELEASED = 7,
    }
}
