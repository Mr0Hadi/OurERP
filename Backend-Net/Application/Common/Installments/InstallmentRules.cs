using Domain.Entities;
using Domain.Enums;

namespace Application.Common.Installments
{
    /// <summary>
    /// The installment math added by GAP-26, in one place (sync, pure - no database):
    ///   late:     an unpaid row is late once DueDate + the Installment.OverdueGraceDays setting has passed;
    ///   penalty:  Amount x LatePenaltyPercentage/100 x daysLate/30 (the rate is monthly, charged per day), rounded half up,
    ///             minus what was waived; daysLate counts from the end of the grace period to the payment date;
    ///   discount: an early settlement forgives each not-yet-due row's share of the installment charge
    ///             (InstallmentChargeAmount x row.Amount / FinancedAmount) times the Installment.EarlySettlementDiscountPercentage
    ///             setting.
    /// </summary>
    public static class InstallmentRules
    {
        public static bool IsUnpaid(SaleInstallment installment) =>
            installment.Status is SaleInstallmentStatusEnum.PENDING or SaleInstallmentStatusEnum.OVERDUE;

        /// <summary>Whole days late on <paramref name="on"/>, after the grace period. 0 when not late.</summary>
        public static int DaysLate(DateTime dueDate, DateTime on, long graceDays) =>
            (int)Math.Max(0, (on.Date - dueDate.Date).Days - graceDays);

        /// <summary>The penalty accrued by <paramref name="on"/>, before any waiver.</summary>
        public static ulong AccruedPenalty(decimal? monthlyPercentage, ulong amount, DateTime dueDate, DateTime on, long graceDays)
        {
            var rate = monthlyPercentage ?? 0;
            var days = DaysLate(dueDate, on, graceDays);
            if (rate <= 0 || days == 0 || amount == 0)
                return 0;

            return (ulong)Math.Round(amount * rate / 100m * days / 30m, MidpointRounding.AwayFromZero);
        }

        /// <summary>What paying <paramref name="installment"/> on <paramref name="on"/> charges as penalty: accrued minus waived.</summary>
        public static ulong PenaltyDue(SaleInstallmentPlan plan, SaleInstallment installment, DateTime on, long graceDays)
        {
            var accrued = AccruedPenalty(plan.LatePenaltyPercentage, installment.Amount, installment.DueDate, on, graceDays);
            return accrued > installment.PenaltyWaivedAmount ? accrued - installment.PenaltyWaivedAmount : 0;
        }

        /// <summary>This row's share of the plan's installment charge (the charge is spread over the financed rows only).</summary>
        public static ulong ChargeShare(SaleInstallmentPlan plan, SaleInstallment row) =>
            plan.FinancedAmount == 0 || plan.InstallmentChargeAmount == 0
                ? 0
                : (ulong)Math.Round((decimal)plan.InstallmentChargeAmount * row.Amount / plan.FinancedAmount, MidpointRounding.AwayFromZero);

        /// <summary>A row not yet due on <paramref name="on"/> - the ones an early settlement discounts.</summary>
        public static bool IsNotYetDue(SaleInstallment row, DateTime on) => row.DueDate.Date > on.Date;
    }
}
