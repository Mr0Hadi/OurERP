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
    }
}
