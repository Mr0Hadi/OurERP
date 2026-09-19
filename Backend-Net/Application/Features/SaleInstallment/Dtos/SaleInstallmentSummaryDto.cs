using Domain.Enums;

namespace Application.Features.SaleInstallment.Dtos
{
    /// <summary>
    /// خلاصه‌ی قرارداد اقساطی برای نمایش. ذخیره نمی‌شود - هرجا PaymentDetailها دیده می‌شوند
    /// (SaleDto، SaleListDto) کنارشان می‌آید و فقط برای فروش‌های اقساطی پر است. بدون لیست
    /// سطرها؛ سطرها در کوئری جزئیات پلن می‌آیند.
    /// </summary>
    public class SaleInstallmentSummaryDto
    {
        public int PlanId { get; set; }
        public UInt64 TotalAmount { get; set; }
        public UInt64 DownPaymentAmount { get; set; }
        public int InstallmentCount { get; set; }
        public int PaidInstallmentCount { get; set; }
        public DateTime? LastPaymentDate { get; set; }
        public DateTime? NextDueDate { get; set; }
        public UInt64 PaidAmount { get; set; }
        public UInt64 RemainingAmount { get; set; }
        public SaleInstallmentPlanStatusEnum Status { get; set; }
        public string StatusTitle { get; set; } = string.Empty;
    }
}
