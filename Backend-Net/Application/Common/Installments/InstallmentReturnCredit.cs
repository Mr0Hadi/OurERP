using Application.Common.Contracts.Context;
using Domain.Entities;
using Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Application.Common.Installments
{
    /// <summary>
    /// What a sale return does to an installment plan (GAP-26 / sale-installment-guide 5.4). The operator already chooses it
    /// with the money method: a refund in CASH/CHECK/TRANSFER gives the money back and leaves the contract alone; a refund left
    /// ON_ACCOUNT is credit the customer has with us, and on a sale under a live plan that credit pays the contract down - the
    /// unpaid tail is shortened from the last installment backwards (a row brought to 0 is CANCELLED) and the amount counts as
    /// paid (SaleInstallmentPlan.ReturnCreditAmount). Whatever exceeds the plan's remaining stays as credit on the account.
    /// Removing the return resolution puts it back. No party-ledger row here: the return's own ON_ACCOUNT row already moved the
    /// balance. Nothing here saves.
    /// </summary>
    public static class InstallmentReturnCredit
    {
        public static async Task ApplyAsync(IWMSDbContext context, Sale sale, int saleReturnClaimId, ulong amount, CancellationToken cancellationToken)
        {
            if (amount == 0 || sale.PaymentType != PaymentTypeEnum.INSTALLMENT)
                return;

            var plan = await LivePlanAsync(context, sale.Id, cancellationToken);
            if (plan == null || plan.Status != SaleInstallmentPlanStatusEnum.ACTIVE)
                return;

            var applied = Math.Min(amount, plan.RemainingAmount);
            var left = applied;
            foreach (var row in plan.Installments.Where(InstallmentRules.IsUnpaid).OrderByDescending(i => i.Number))
            {
                if (left == 0)
                    break;
                var take = Math.Min(row.Amount, left);
                row.Amount -= take;
                left -= take;
                if (row.Amount == 0)
                    row.Status = SaleInstallmentStatusEnum.CANCELLED;
                row.UpdatedAt = DateTime.Now;
            }

            plan.ReturnCreditAmount += applied;
            plan.ReturnCredits.Add(new SaleInstallmentReturnCredit
            {
                SaleReturnClaimId = saleReturnClaimId,
                RequestedAmount = amount,
                AppliedAmount = applied,
                CreatedAt = DateTime.Now,
            });
            if (plan.RemainingAmount == 0)
                plan.Status = SaleInstallmentPlanStatusEnum.SETTLED;
            plan.UpdatedAt = DateTime.Now;
            sale.PaidAmount = plan.PaidAmount;
        }

        public static async Task ReverseAsync(IWMSDbContext context, Sale sale, int saleReturnClaimId, ulong amount, CancellationToken cancellationToken)
        {
            if (amount == 0 || sale.PaymentType != PaymentTypeEnum.INSTALLMENT)
                return;

            var plan = await LivePlanAsync(context, sale.Id, cancellationToken);
            var credit = plan?.ReturnCredits
                .Where(c => c.SaleReturnClaimId == saleReturnClaimId && c.RequestedAmount == amount && c.ReversedAt == null)
                .OrderBy(c => c.Id)
                .FirstOrDefault();
            if (plan == null || credit == null)
                return;

            credit.ReversedAt = DateTime.Now;
            if (credit.AppliedAmount == 0)
                return;

            // Back onto the last unpaid installment; with none left, as a new one a month after the last due date.
            var last = plan.Installments.Where(InstallmentRules.IsUnpaid).OrderByDescending(i => i.Number).FirstOrDefault();
            if (last != null)
            {
                last.Amount += credit.AppliedAmount;
                last.UpdatedAt = DateTime.Now;
            }
            else
            {
                var lastDue = plan.Installments.Select(i => i.DueDate).DefaultIfEmpty(DateTime.Today).Max();
                plan.Installments.Add(new SaleInstallment
                {
                    Number = plan.Installments.Select(i => i.Number).DefaultIfEmpty(0).Max() + 1,
                    DueDate = (lastDue > DateTime.Today ? lastDue : DateTime.Today).AddMonths(1),
                    Amount = credit.AppliedAmount,
                    Status = SaleInstallmentStatusEnum.PENDING,
                    CreatedAt = DateTime.Now,
                    UpdatedAt = DateTime.Now,
                });
            }

            plan.ReturnCreditAmount -= credit.AppliedAmount;
            if (plan.Status == SaleInstallmentPlanStatusEnum.SETTLED)
                plan.Status = SaleInstallmentPlanStatusEnum.ACTIVE;
            plan.UpdatedAt = DateTime.Now;
            sale.PaidAmount = plan.PaidAmount;
        }

        private static Task<SaleInstallmentPlan?> LivePlanAsync(IWMSDbContext context, int saleId, CancellationToken cancellationToken) =>
            context.SaleInstallmentPlans
                .Include(x => x.Installments)
                .Include(x => x.ReturnCredits)
                .Where(x => x.SaleId == saleId && x.IsActive && x.Status != SaleInstallmentPlanStatusEnum.CANCELLED)
                .FirstOrDefaultAsync(cancellationToken);
    }
}
