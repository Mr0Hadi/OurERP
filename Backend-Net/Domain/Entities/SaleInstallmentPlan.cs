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

        /// <summary>قیمت نقدی = جمع فاکتور فروش (<c>Sale.TotalAmount</c>، با مالیات). سرور می‌نشاند، نه کلاینت.</summary>
        public UInt64 CashAmount { get; set; }

        /// <summary>درصد افزایش روی قیمت نقدی؛ دستی توسط اوپراتور وارد می‌شود.</summary>
        public decimal MarkupPercentage { get; set; }

        /// <summary>
        /// سود اقساط = round(CashAmount × MarkupPercentage / 100). جدا از جمع فاکتور نگه داشته می‌شود: فاکتور فقط اقلام و
        /// مالیاتشان است، این مبلغ هزینه‌ی خرید قسطی است. طبقه‌بندی حسابداری‌اش (درآمد مالی یا چیز دیگر) عمداً اینجا تعیین نمی‌شود.
        /// </summary>
        public UInt64 InstallmentChargeAmount { get; set; }

        /// <summary>مبلغ نهایی قابل پرداخت مشتری = CashAmount + InstallmentChargeAmount. سرور حساب می‌کند.</summary>
        public UInt64 TotalAmount { get; set; }

        public UInt64 DownPaymentAmount { get; set; }

        /// <summary>مبلغ باقیمانده‌ی تقسیم‌شده = TotalAmount - DownPaymentAmount.</summary>
        public UInt64 FinancedAmount { get; set; }

        /// <summary>تعداد کل اقساط (به‌جز پیش‌پرداخت).</summary>
        public int InstallmentCount { get; set; }

        /// <summary>مبلغ هر قسط؛ باقیمانده‌ی رُند روی قسط آخر می‌نشیند.</summary>
        public UInt64 InstallmentAmount { get; set; }

        public DateTime FirstDueDate { get; set; }

        /// <summary>
        /// Monthly late penalty, as a percentage of the late installment, charged per day late (rate / 30 per day) after the
        /// Installment.OverdueGraceDays setting (InstallmentRules.Penalty). Null or 0 = no penalty.
        /// </summary>
        public decimal? LatePenaltyPercentage { get; set; }

        /// <summary>
        /// Installment charge forgiven by an early settlement: the charge share of the rows not yet due, times the
        /// Installment.EarlySettlementDiscountPercentage setting. Already taken off InstallmentChargeAmount/TotalAmount and off
        /// those rows' Amount; kept here to show it.
        /// </summary>
        public UInt64 EarlySettlementDiscountAmount { get; set; }

        /// <summary>
        /// Money a sale return left on the customer's account (MONEY_OUT, ON_ACCOUNT) and that now counts as paid towards this
        /// plan: the unpaid tail was shortened by it (InstallmentReturnCredit). Part of PaidAmount.
        /// </summary>
        public UInt64 ReturnCreditAmount { get; set; }
        public List<SaleInstallmentReturnCredit> ReturnCredits { get; set; } = new();

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
        public UInt64 PaidAmount => DownPaymentAmount + PaidInstallmentsAmount + ReturnCreditAmount;

        /// <summary>Late penalties charged on the paid rows - not part of PaidAmount/TotalAmount.</summary>
        [NotMapped]
        public UInt64 PenaltyPaidAmount => Installments.Where(i => i.Status == SaleInstallmentStatusEnum.PAID)
            .Aggregate(0UL, (sum, i) => sum + i.PenaltyAmount);

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
