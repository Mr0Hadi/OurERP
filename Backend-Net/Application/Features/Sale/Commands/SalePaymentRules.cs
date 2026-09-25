using Application.Common.Contracts.Context;
using Common.Exceptions;
using Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Sale.Commands
{
    /// <summary>Checks shared by AddSalePayment / EditSalePayment / VoidSalePayment.</summary>
    internal static class SalePaymentRules
    {
        /// <summary>
        /// An installment sale's money moves through its plan (down payment, installments, settlement), which also moves
        /// the installments' own status. Ordinary payments are only accepted once its plan has been cancelled.
        /// </summary>
        public static async Task EnsureNotUnderInstallmentPlanAsync(IWMSDbContext context, Domain.Entities.Sale sale, CancellationToken cancellationToken)
        {
            if (sale.PaymentType != PaymentTypeEnum.INSTALLMENT)
                return;

            var planCancelled = await context.SaleInstallmentPlans
                .AnyAsync(x => x.SaleId == sale.Id && x.Status == SaleInstallmentPlanStatusEnum.CANCELLED, cancellationToken);
            var planOpen = await context.SaleInstallmentPlans
                .AnyAsync(x => x.SaleId == sale.Id && x.IsActive && x.Status != SaleInstallmentPlanStatusEnum.CANCELLED, cancellationToken);

            if (planOpen || !planCancelled)
                throw new ValidationCustomException("پرداخت‌های فروش اقساطی از مسیر قرارداد اقساطی ثبت می‌شوند.");
        }
    }
}
