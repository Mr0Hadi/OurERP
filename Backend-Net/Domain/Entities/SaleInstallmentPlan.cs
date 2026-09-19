using System.ComponentModel.DataAnnotations.Schema;
using Domain.Enums;

namespace Domain.Entities
{
    /// <summary>
    /// قرارداد اقساطی یک فروش - یک‌به‌یک با <see cref="Sale"/>.
    /// خودِ سطرهای قسط در <see cref="Installments"/> نگهداری می‌شوند و رکورد واقعی‌اند؛
    /// آبجکت خلاصه‌ی نمایشی (SaleInstallmentSummaryDto) ذخیره نمی‌شود و از همین roll-upها ساخته می‌شود.
    /// </summary>
    public class SaleInstallmentPlan
    {
        public int Id { get; set; }

        public int SaleId { get; set; }
        public Sale Sale { get; set; }

        /// <summary>قیمت نقدی پایه، قبل از افزایش.</summary>
        public UInt64 CashAmount { get; set; }

        /// <summary>درصد افزایش روی قیمت نقدی؛ دستی توسط اوپراتور وارد می‌شود.</summary>
        public decimal MarkupPercentage { get; set; }

        /// <summary>مبلغ کل قسطی. باید با <c>Sale.TotalAmount</c> برابر باشد.</summary>
        public UInt64 TotalAmount { get; set; }

        public UInt64 DownPaymentAmount { get; set; }

        /// <summary>مبلغ باقیمانده‌ی تقسیم‌شده = TotalAmount - DownPaymentAmount.</summary>
        public UInt64 FinancedAmount { get; set; }

        /// <summary>تعداد کل اقساط (به‌جز پیش‌پرداخت).</summary>
        public int InstallmentCount { get; set; }

        /// <summary>مبلغ هر قسط؛ باقیمانده‌ی رُند روی قسط آخر می‌نشیند.</summary>
        public UInt64 InstallmentAmount { get; set; }

        public DateTime FirstDueDate { get; set; }

        // TODO (جریمه‌ی دیرکرد): فقط ذخیره می‌شود - هیچ محاسبه‌ای روی آن انجام نمی‌شود و هیچ‌جا
        // خوانده نمی‌شود. پرسش‌های باز (پایه‌ی درصد، روزانه/ماهانه، خودکار/دستی، جدا از TotalAmount
        // یا داخل آن) در docs/sale-installment-guide.fa.md بخش «موارد باز» ثبت شده‌اند.
        public decimal? LatePenaltyPercentage { get; set; }

        public SaleInstallmentPlanStatusEnum Status { get; set; }

        public List<SaleInstallment> Installments { get; set; } = new();

        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }

        // roll-upهای زیر در حافظه‌اند و به SQL ترجمه نمی‌شوند. هر handler یا کوئری‌ای که به
        // آن‌ها تکیه می‌کند باید Installments را Include کرده باشد، وگرنه بی‌سروصدا صفر حساب
        // می‌شود. کوئری‌های لیست که projection سمت سرور دارند جمع‌ها را صریح می‌نویسند.

        [NotMapped]
        public int PaidInstallmentCount => Installments.Count(i => i.Status == SaleInstallmentStatusEnum.PAID);

        [NotMapped]
        public int RemainingInstallmentCount => Installments.Count(i => i.Status == SaleInstallmentStatusEnum.PENDING
                                                                       || i.Status == SaleInstallmentStatusEnum.OVERDUE);

        [NotMapped]
        public UInt64 PaidInstallmentsAmount => Installments.Where(i => i.Status == SaleInstallmentStatusEnum.PAID)
            .Aggregate(0UL, (sum, i) => sum + i.Amount);

        [NotMapped]
        public UInt64 PaidAmount => DownPaymentAmount + PaidInstallmentsAmount;

        [NotMapped]
        public UInt64 RemainingAmount => TotalAmount > PaidAmount ? TotalAmount - PaidAmount : 0UL;

        /// <summary>
        /// آخرین تاریخ پرداخت. اگر هیچ قسطی پرداخت نشده باشد، تاریخ پیش‌پرداخت - که همان
        /// <see cref="CreatedAt"/> است: پلن و PaymentDetailِ پیش‌پرداخت در یک لحظه ساخته می‌شوند.
        /// </summary>
        [NotMapped]
        public DateTime? LastPaymentDate
        {
            get
            {
                var lastInstallment = Installments
                    .Where(i => i.Status == SaleInstallmentStatusEnum.PAID && i.PaidAt.HasValue)
                    .Select(i => i.PaidAt!.Value)
                    .DefaultIfEmpty(default)
                    .Max();

                return lastInstallment == default ? CreatedAt : lastInstallment;
            }
        }

        /// <summary>سررسید قسط بعدیِ پرداخت‌نشده؛ پس از تسویه null.</summary>
        [NotMapped]
        public DateTime? NextDueDate => Installments
            .Where(i => i.Status == SaleInstallmentStatusEnum.PENDING || i.Status == SaleInstallmentStatusEnum.OVERDUE)
            .Select(i => (DateTime?)i.DueDate)
            .Min();
    }
}
