using System.ComponentModel;

namespace Domain.Enums
{
    /// <summary>
    /// وضعیت یک سطر قسط.
    ///
    /// توجه: <see cref="OVERDUE"/> عمداً توسط هیچ کدی نوشته نمی‌شود. هیچ background service،
    /// هیچ job و هیچ اندپوینت بازمحاسبه‌ای برای علامت‌گذاری دیرکرد وجود ندارد؛ تشخیص «سررسید
    /// گذشته» از روی <c>DueDate</c> کارِ فرانت است (Status = PENDING و DueDate &lt; امروز).
    /// این عضو فقط برای زمانی نگه داشته شده که بعداً تصمیم بگیریم علامت‌گذاری دستی یا خودکار
    /// اضافه کنیم - فراموش نشده است. کوئری‌ها آن را در کنار PENDING به‌عنوان «پرداخت‌نشده»
    /// حساب می‌کنند تا اگر روزی نوشته شد، منطق موجود نشکند.
    /// </summary>
    public enum SaleInstallmentStatusEnum
    {
        [Description("پرداخت‌نشده")]
        PENDING = 0,
        [Description("پرداخت‌شده")]
        PAID = 1,
        [Description("سررسید گذشته")]
        OVERDUE = 2,
        [Description("ابطال شده")]
        CANCELLED = 3,
    }
}
