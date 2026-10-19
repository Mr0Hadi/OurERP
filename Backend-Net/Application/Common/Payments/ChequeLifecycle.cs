using Application.Common.Contracts.Context;
using Application.Common.Ledger;
using Common.Exceptions;
using Domain.Entities;
using Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Application.Common.Payments
{
    /// <summary>
    /// What a bounced cheque undoes (GAP-03.3), in one place for BounceCheck and for the received cheque behind a bounced
    /// endorsed one. The cheque's payment row is taken back exactly like a void (VoidedAt + REVERSAL of every party-ledger row
    /// of that payment, late penalty included), plus whatever the payment had paid:
    ///   - an ordinary payment on a sale or purchase: its PaidAmount is recomputed (an issued invoice stays issued);
    ///   - installments: every row it paid goes back to PENDING (the overdue job re-marks it), its penalty is cleared, and an
    ///     early-settlement discount it got is put back on the row, the plan and the customer's account; a SETTLED plan is
    ///     ACTIVE again;
    ///   - an on-account payment: its allocations are removed, so the invoices it paid owe again;
    ///   - a cheque we passed on to a supplier: the received cheque it was bounces too - the customer owes us again.
    /// A down-payment cheque cannot bounce through here: the plan has no state for "down payment not received" - cancel and
    /// recreate the plan instead. Nothing here saves.
    /// </summary>
    public static class ChequeLifecycle
    {
        public static async Task BounceAsync(IWMSDbContext context, PaymentDetail cheque, DateTime at, string? note, CancellationToken cancellationToken)
        {
            if (cheque.Purpose == PaymentPurposeEnum.INSTALLMENT_DOWN_PAYMENT)
                throw new ValidationCustomException("چک پیش‌پرداخت قرارداد اقساطی از این مسیر برگشت نمی‌خورد؛ قرارداد را ابطال و دوباره ثبت کنید.");

            cheque.VoidedAt = at;
            cheque.CheckStatus = PaymentCheckStatusEnum.BOUNCED;
            cheque.CheckStatusChangedAt = at;
            cheque.CheckStatusNote = string.IsNullOrWhiteSpace(note) ? null : note.Trim();
            await PartyLedger.PaymentVoidedAsync(context, cheque, at, cancellationToken);

            if (cheque.Purpose == PaymentPurposeEnum.INSTALLMENT)
                await RevertInstallmentsAsync(context, cheque, at, cancellationToken);
            else if (cheque.SaleId.HasValue)
            {
                var sale = await context.Sales.Include(x => x.PaymentDetails).Include(x => x.PaymentAllocations)
                    .FirstAsync(x => x.Id == cheque.SaleId, cancellationToken);
                sale.PaidAmount = DocumentPayments.NetPaid(sale.PaymentDetails, sale.PaymentAllocations, DocumentPayments.SaleDirection);
                sale.UpdatedAt = at;
            }
            else if (cheque.PurchaseId.HasValue)
            {
                var purchase = await context.Purchases.Include(x => x.PaymentDetails).Include(x => x.PaymentAllocations)
                    .FirstAsync(x => x.Id == cheque.PurchaseId, cancellationToken);
                purchase.PaidAmount = DocumentPayments.NetPaid(purchase.PaymentDetails, purchase.PaymentAllocations, DocumentPayments.PurchaseDirection);
                purchase.UpdatedAt = at;
            }
            else
            {
                var allocations = await context.PaymentAllocations
                    .Where(a => a.PaymentDetailId == cheque.Id && a.VoidedAt == null)
                    .ToListAsync(cancellationToken);
                foreach (var allocation in allocations)
                    await PaymentAllocator.RemoveAsync(context, allocation, cancellationToken);
            }

            if (cheque.EndorsedFromPaymentDetailId.HasValue)
            {
                var received = await context.PaymentDetails.FirstAsync(x => x.Id == cheque.EndorsedFromPaymentDetailId, cancellationToken);
                if (received.CheckStatus == PaymentCheckStatusEnum.ENDORSED && received.VoidedAt == null)
                    await BounceAsync(context, received, at, "چک خرج‌شده نزد تامین‌کننده برگشت خورد" + (string.IsNullOrWhiteSpace(note) ? string.Empty : $" - {note.Trim()}"), cancellationToken);
            }
        }

        private static async Task RevertInstallmentsAsync(IWMSDbContext context, PaymentDetail cheque, DateTime at, CancellationToken cancellationToken)
        {
            var plan = await context.SaleInstallmentPlans
                .Include(x => x.Installments)
                .Include(x => x.Sale)
                .FirstOrDefaultAsync(x => x.Installments.Any(i => i.PaymentDetailId == cheque.Id), cancellationToken);
            if (plan == null)
                return;

            var restored = 0UL;
            foreach (var installment in plan.Installments.Where(i => i.PaymentDetailId == cheque.Id))
            {
                installment.Status = SaleInstallmentStatusEnum.PENDING;
                installment.PaidAt = null;
                installment.PaymentType = null;
                installment.PaymentDetailId = null;
                installment.PaymentDetail = null;
                installment.PenaltyAmount = 0;
                installment.Amount += installment.EarlySettlementDiscountAmount;
                restored += installment.EarlySettlementDiscountAmount;
                installment.EarlySettlementDiscountAmount = 0;
                installment.UpdatedAt = at;
            }

            if (restored > 0)
            {
                plan.InstallmentChargeAmount += restored;
                plan.TotalAmount += restored;
                plan.FinancedAmount += restored;
                plan.EarlySettlementDiscountAmount -= restored;
                await PartyLedger.InstallmentChargeChangedAsync(context, plan.Sale, plan.InstallmentChargeAmount, at, cancellationToken);
            }

            if (plan.Status == SaleInstallmentPlanStatusEnum.SETTLED)
                plan.Status = SaleInstallmentPlanStatusEnum.ACTIVE;
            plan.UpdatedAt = at;
            plan.Sale.PaidAmount = plan.PaidAmount;
            plan.Sale.UpdatedAt = at;
        }
    }
}
