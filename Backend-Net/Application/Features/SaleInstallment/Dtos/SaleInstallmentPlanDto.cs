using Application.Common.Dtos;
using Domain.Enums;

namespace Application.Features.SaleInstallment.Dtos
{
    /// <summary>جزئیات کامل یک قرارداد اقساطی: فیلدهای پلن + roll-upها + سطرها + پرداخت‌های فروش.</summary>
    public class SaleInstallmentPlanDto
    {
        public int Id { get; set; }
        public int SaleId { get; set; }
        public string InvoiceNumber { get; set; } = string.Empty;
        public int CustomerId { get; set; }
        public string CustomerName { get; set; } = string.Empty;

        public UInt64 CashAmount { get; set; }
        public decimal MarkupPercentage { get; set; }
        public UInt64 TotalAmount { get; set; }
        public UInt64 DownPaymentAmount { get; set; }
        public UInt64 FinancedAmount { get; set; }
        public int InstallmentCount { get; set; }
        public UInt64 InstallmentAmount { get; set; }
        public DateTime FirstDueDate { get; set; }

        /// <summary>فقط ذخیره می‌شود؛ هیچ محاسبه‌ای روی آن انجام نمی‌شود (جریمه‌ی دیرکرد هنوز پیاده نشده).</summary>
        public decimal? LatePenaltyPercentage { get; set; }

        public SaleInstallmentPlanStatusEnum Status { get; set; }
        public string StatusTitle { get; set; } = string.Empty;

        public int PaidInstallmentCount { get; set; }
        public int RemainingInstallmentCount { get; set; }
        public UInt64 PaidInstallmentsAmount { get; set; }
        public UInt64 PaidAmount { get; set; }
        public UInt64 RemainingAmount { get; set; }
        public DateTime? LastPaymentDate { get; set; }
        public DateTime? NextDueDate { get; set; }

        public DateTime CreatedAt { get; set; }

        public List<SaleInstallmentDto> Installments { get; set; } = new();
        public List<PaymentDetailDto> PaymentDetails { get; set; } = new();
    }
}
