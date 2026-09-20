using Domain.Enums;

namespace Domain.Entities
{
    /// <summary>
    /// یک سطر قسط. بدون <c>IsActive</c> - چرخه‌ی عمرش با <see cref="Status"/> است و ابطال پلن
    /// سطرهای پرداخت‌نشده را CANCELLED می‌کند (همان الگوی PurchaseReturn).
    /// </summary>
    public class SaleInstallment
    {
        public int Id { get; set; }

        public int SaleInstallmentPlanId { get; set; }
        public SaleInstallmentPlan Plan { get; set; }

        /// <summary>شماره‌ی ترتیبی، ۱-based.</summary>
        public int Number { get; set; }

        /// <summary>سررسید؛ فاصله‌ی ثابت ماهانه از <c>Plan.FirstDueDate</c>.</summary>
        public DateTime DueDate { get; set; }

        public UInt64 Amount { get; set; }

        public SaleInstallmentStatusEnum Status { get; set; }

        public DateTime? PaidAt { get; set; }

        /// <summary>روش پرداخت این قسط (نقد/چک/انتقال/...).</summary>
        public PaymentTypeEnum? PaymentType { get; set; }

        /// <summary>لینک به رکورد مالی واقعی.</summary>
        public int? PaymentDetailId { get; set; }
        public PaymentDetail? PaymentDetail { get; set; }

        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}
