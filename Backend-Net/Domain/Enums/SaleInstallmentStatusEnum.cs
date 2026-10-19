using System.ComponentModel;

namespace Domain.Enums
{
    /// <summary>
    /// وضعیت یک سطر قسط. Since 2026-10-19 <see cref="OVERDUE"/> is written by the background job
    /// (WMS/BackgroundJobs/InstallmentOverdueJob -> MarkOverdueSaleInstallmentsCommand) once DueDate plus the
    /// Installment.OverdueGraceDays setting has passed; queries keep counting it with PENDING as "unpaid".
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
