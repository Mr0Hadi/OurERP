using Application.Common.Contracts.Context;
using Application.Common.Documents;
using Application.Common.Sales;
using Application.Features.Sale.Commands;
using Common.Exceptions;
using Domain.Entities;
using Domain.Enums;
using FluentValidation;
using Microsoft.EntityFrameworkCore;

namespace Application.Common.Payments
{
    /// <summary>One slice of an on-account payment to apply: exactly one of SaleId / PurchaseId.</summary>
    public class PaymentAllocationInput
    {
        public int? SaleId { get; set; }
        public int? PurchaseId { get; set; }
        public UInt64 Amount { get; set; }
    }

    public class PaymentAllocationInputValidator : AbstractValidator<List<PaymentAllocationInput>>
    {
        public PaymentAllocationInputValidator()
        {
            RuleForEach(x => x).ChildRules(a =>
            {
                a.RuleFor(x => x).Must(x => x.SaleId.HasValue != x.PurchaseId.HasValue)
                    .WithMessage("هر تخصیص دقیقاً به یک فاکتور فروش یا یک فاکتور خرید است.");
                a.RuleFor(x => x.Amount).GreaterThan(0UL).WithMessage("مبلغ تخصیص باید از صفر بیشتر باشد.");
            });
            RuleFor(x => x)
                .Must(l => l.Select(a => (a.SaleId, a.PurchaseId)).Distinct().Count() == l.Count)
                .WithMessage("هر فاکتور فقط یک‌بار در تخصیص می‌آید.");
        }
    }

    /// <summary>
    /// Applies an on-account payment to sales or purchases (GAP-03). The rules, in one place for AddPartyPayment and
    /// AllocatePartyPayment:
    ///   - a customer's payment IN pays that customer's sales; a supplier's payment OUT pays that supplier's purchases. A
    ///     refund the other way (money back to a customer, from a supplier) stays on the account and is never allocated;
    ///   - the document is active, not cancelled, and takes ordinary payments (an installment sale's money moves through its
    ///     plan; a proforma sale must be WAREHOUSE_CHECKED with its reservation still running - allocating to it is paying it,
    ///     so it issues the invoice, exactly like AddSalePayment);
    ///   - each slice fits what the document still owes, and all slices together fit what the payment has left.
    /// Bookkeeping only: no party-ledger row (the payment already moved the balance), no bank movement. Nothing here saves.
    /// </summary>
    public static class PaymentAllocator
    {
        public static async Task AllocateAsync(IWMSDbContext context, PaymentDetail payment, IReadOnlyCollection<PaymentAllocationInput> inputs, int? userId, CancellationToken cancellationToken)
        {
            if (inputs.Count == 0)
                return;

            if (payment.VoidedAt != null)
                throw new ValidationCustomException("دریافت/پرداخت ابطال‌شده تخصیص داده نمی‌شود.");
            if (payment.CustomerId == null && payment.SupplierId == null)
                throw new ValidationCustomException("فقط دریافت/پرداخت علی‌الحساب تخصیص داده می‌شود؛ پرداخت روی فاکتور از قبل به همان فاکتور تعلق دارد.");

            var natural = payment.CustomerId != null ? DocumentPayments.SaleDirection : DocumentPayments.PurchaseDirection;
            if (payment.Direction != natural)
                throw new ValidationCustomException(payment.CustomerId != null
                    ? "وجهی که به مشتری برگردانده شده به فاکتور تخصیص داده نمی‌شود؛ در حساب مشتری می‌ماند."
                    : "وجهی که تامین‌کننده برگردانده به فاکتور تخصیص داده نمی‌شود؛ در حساب تامین‌کننده می‌ماند.");

            var total = inputs.Aggregate(0UL, (sum, x) => sum + x.Amount);
            var unallocated = DocumentPayments.Unallocated(payment);
            if (total > unallocated)
                throw new ValidationCustomException($"از این مبلغ فقط {unallocated:N0} ریال تخصیص‌نیافته مانده است.");

            var now = DateTime.Now;
            foreach (var input in inputs)
            {
                var allocation = new PaymentAllocation
                {
                    PaymentDetail = payment,
                    Amount = input.Amount,
                    AllocatedAt = now,
                    AllocatedByUserId = userId,
                };

                if (input.SaleId.HasValue)
                    await ToSaleAsync(context, payment, input, allocation, cancellationToken);
                else
                    await ToPurchaseAsync(context, payment, input, allocation, cancellationToken);

                payment.Allocations.Add(allocation);
            }
        }

        private static async Task ToSaleAsync(IWMSDbContext context, PaymentDetail payment, PaymentAllocationInput input, PaymentAllocation allocation, CancellationToken cancellationToken)
        {
            if (payment.CustomerId == null)
                throw new ValidationCustomException("پرداخت به تامین‌کننده به فاکتور فروش تخصیص داده نمی‌شود.");

            var sale = await context.Sales
                .Include(x => x.PaymentDetails)
                .Include(x => x.PaymentAllocations)
                .FirstOrDefaultAsync(x => x.Id == input.SaleId && x.IsActive, cancellationToken)
                ?? throw new NotFoundCustomException("فروش مورد نظر یافت نشد.");

            if (sale.CustomerId != payment.CustomerId)
                throw new ValidationCustomException($"فاکتور {Label(sale.InvoiceNumber, sale.Id)} مال مشتری دیگری است.");
            if (sale.Status == SalesStatusEnum.CANCELLED)
                throw new ValidationCustomException($"فاکتور {Label(sale.InvoiceNumber, sale.Id)} لغو شده است.");
            await SalePaymentRules.EnsureNotUnderInstallmentPlanAsync(context, sale, cancellationToken);
            SaleProformaPipeline.EnsureReadyForPayment(sale);

            var remaining = sale.TotalAmount > sale.PaidAmount ? sale.TotalAmount - sale.PaidAmount : 0UL;
            if (input.Amount > remaining)
                throw new ValidationCustomException($"مانده‌ی فاکتور {Label(sale.InvoiceNumber, sale.Id)} {remaining:N0} ریال است.");

            allocation.Sale = sale;
            allocation.SaleId = sale.Id;
            sale.PaymentAllocations.Add(allocation);
            sale.PaidAmount = DocumentPayments.NetPaid(sale.PaymentDetails, sale.PaymentAllocations, DocumentPayments.SaleDirection);
            sale.UpdatedAt = DateTime.Now;

            // Paying a proforma issues its invoice - the same rule as AddSalePayment.
            if (sale.Status == SalesStatusEnum.PROFORMA && sale.PaidAmount > 0)
                await SaleInvoiceFinalizer.FinalizeAsync(context, sale, cancellationToken);
        }

        private static async Task ToPurchaseAsync(IWMSDbContext context, PaymentDetail payment, PaymentAllocationInput input, PaymentAllocation allocation, CancellationToken cancellationToken)
        {
            if (payment.SupplierId == null)
                throw new ValidationCustomException("دریافت از مشتری به فاکتور خرید تخصیص داده نمی‌شود.");

            var purchase = await context.Purchases
                .Include(x => x.Items)
                .Include(x => x.PaymentDetails)
                .Include(x => x.PaymentAllocations)
                .FirstOrDefaultAsync(x => x.Id == input.PurchaseId && x.IsActive, cancellationToken)
                ?? throw new NotFoundCustomException("خرید مورد نظر یافت نشد.");

            if (purchase.SupplierId != payment.SupplierId)
                throw new ValidationCustomException($"فاکتور خرید {Label(purchase.InvoiceNumber, purchase.Id)} مال تامین‌کننده‌ی دیگری است.");
            if (purchase.Status == PurchaseStatusEnum.CANCELLED)
                throw new ValidationCustomException($"فاکتور خرید {Label(purchase.InvoiceNumber, purchase.Id)} لغو شده است.");

            var payable = PayableAmount(purchase);
            var remaining = payable > purchase.PaidAmount ? payable - purchase.PaidAmount : 0UL;
            if (input.Amount > remaining)
                throw new ValidationCustomException($"مانده‌ی فاکتور خرید {Label(purchase.InvoiceNumber, purchase.Id)} {remaining:N0} ریال است.");

            allocation.Purchase = purchase;
            allocation.PurchaseId = purchase.Id;
            purchase.PaymentAllocations.Add(allocation);
            purchase.PaidAmount = DocumentPayments.NetPaid(purchase.PaymentDetails, purchase.PaymentAllocations, DocumentPayments.PurchaseDirection);
            purchase.UpdatedAt = DateTime.Now;
        }

        /// <summary>Takes one allocation back and recomputes its document's PaidAmount. A sale it issued stays issued.</summary>
        public static async Task RemoveAsync(IWMSDbContext context, PaymentAllocation allocation, CancellationToken cancellationToken)
        {
            if (allocation.VoidedAt != null)
                throw new ValidationCustomException("این تخصیص قبلاً حذف شده است.");

            allocation.VoidedAt = DateTime.Now;

            if (allocation.SaleId.HasValue)
            {
                var sale = await context.Sales
                    .Include(x => x.PaymentDetails)
                    .Include(x => x.PaymentAllocations)
                    .FirstAsync(x => x.Id == allocation.SaleId, cancellationToken);
                sale.PaidAmount = DocumentPayments.NetPaid(sale.PaymentDetails, sale.PaymentAllocations, DocumentPayments.SaleDirection);
                sale.UpdatedAt = DateTime.Now;
            }
            else
            {
                var purchase = await context.Purchases
                    .Include(x => x.PaymentDetails)
                    .Include(x => x.PaymentAllocations)
                    .FirstAsync(x => x.Id == allocation.PurchaseId, cancellationToken);
                purchase.PaidAmount = DocumentPayments.NetPaid(purchase.PaymentDetails, purchase.PaymentAllocations, DocumentPayments.PurchaseDirection);
                purchase.UpdatedAt = DateTime.Now;
            }
        }

        /// <summary>What a purchase is worth paying: its total minus the share of lines closed short (same as PurchaseDto.PayableAmount).</summary>
        public static ulong PayableAmount(Domain.Entities.Purchase purchase)
        {
            var shortClosed = purchase.Items.Aggregate(0UL, (sum, i) => sum + InvoiceLineMath.ShareOfTotal(i.TotalAmount, i.Quantity, i.ShortClosedQuantity));
            return purchase.TotalAmount > shortClosed ? purchase.TotalAmount - shortClosed : 0UL;
        }

        private static string Label(string? invoiceNumber, int id) => string.IsNullOrWhiteSpace(invoiceNumber) ? $"#{id}" : invoiceNumber;
    }
}
