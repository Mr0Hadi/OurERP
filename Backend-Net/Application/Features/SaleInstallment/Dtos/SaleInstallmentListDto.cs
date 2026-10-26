using Domain.Enums;

namespace Application.Features.SaleInstallment.Dtos
{
    /// <summary>
    /// یک قسط در سطح کل سیستم. صفحه‌های «سررسیدگذشته» و «پرداخت‌های پیش‌رو» روی همین سطر
    /// ساخته می‌شوند - اندپوینت جداگانه‌ای برای آن‌ها وجود ندارد.
    /// </summary>
    public class SaleInstallmentListDto
    {
        public int InstallmentId { get; set; }
        public int Number { get; set; }
        public DateTime DueDate { get; set; }
        public UInt64 Amount { get; set; }
        public SaleInstallmentStatusEnum Status { get; set; }
        public string StatusTitle { get; set; } = string.Empty;
        public DateTime? PaidAt { get; set; }
        public PaymentTypeEnum? PaymentType { get; set; }
        public int PlanId { get; set; }
        public int SaleId { get; set; }
        public string InvoiceNumber { get; set; } = string.Empty;
        public int CustomerId { get; set; }
        public string CustomerName { get; set; } = string.Empty;

        /// <summary>The plan's monthly late-penalty rate (null = no penalty).</summary>
        public decimal? LatePenaltyPercentage { get; set; }

        /// <summary>Paid rows: the penalty charged with the payment. Unpaid rows: 0.</summary>
        public UInt64 PenaltyAmount { get; set; }

        /// <summary>Unpaid rows: days late today (after the grace days) and the penalty paying today would charge, waiver included. Same as SaleInstallmentDto.</summary>
        public int DaysLate { get; set; }
        public UInt64 PenaltyDue { get; set; }
        public UInt64 PenaltyWaivedAmount { get; set; }
    }
}
