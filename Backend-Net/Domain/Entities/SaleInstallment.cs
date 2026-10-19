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

        /// <summary>
        /// The late penalty charged when this row was paid (0 when paid on time, or before 2026-10-19). Kept apart from Amount:
        /// it is not part of the plan's TotalAmount, so "PaidAmount == TotalAmount means SETTLED" still holds.
        /// </summary>
        public UInt64 PenaltyAmount { get; set; }

        /// <summary>Penalty forgiven in advance (WaiveSaleInstallmentPenalty); taken off what is charged at payment.</summary>
        public UInt64 PenaltyWaivedAmount { get; set; }
        public string? PenaltyWaiveReason { get; set; }

        /// <summary>
        /// What an early settlement took off this row's Amount (its share of the installment charge). Kept so that a bounced
        /// settlement cheque can put it back.
        /// </summary>
        public UInt64 EarlySettlementDiscountAmount { get; set; }

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
