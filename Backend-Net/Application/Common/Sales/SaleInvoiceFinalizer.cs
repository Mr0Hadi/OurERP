using Application.Common.Ledger;
using Application.Common.Contracts.Context;
using Common.Exceptions;
using Common.Extensions;
using Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Application.Common.Sales
{
    /// <summary>
    /// خروج فروش از «پیش‌فاکتور»: تولید شماره‌ی فاکتور رسمی، تاریخ فاکتور، و بردن وضعیت به
    /// PROCESSING. سه handler به آن نیاز دارند (CreateSale، UpdateSale و
    /// CreateSaleInstallmentPlan) و منطقش نباید سه‌بار کپی شود.
    /// </summary>
    public static class SaleInvoiceFinalizer
    {
        /// <summary>شماره‌ی فاکتور رسمی بعدی.</summary>
        public static async Task<string> NextInvoiceNumberAsync(IWMSDbContext context, CancellationToken cancellationToken)
        {
            var seq = await context.Sales.CountAsync(cancellationToken) + 1;

            return Generator.GenerateInvoiceNumber(seq);
        }

        /// <summary>
        /// The invoice date a request may name when it issues the invoice: optional, and never after today. Shared by the
        /// validators of AddSalePayment, CreateSaleInstallmentPlan and CompleteInPersonSale.
        /// </summary>
        public static bool IsValidInvoiceDate(DateTime? invoiceDate) =>
            !invoiceDate.HasValue || (invoiceDate.Value != default && invoiceDate.Value.Date <= DateTime.Today);

        public const string InvoiceDateMessage = "تاریخ فاکتور نمی‌تواند بعد از امروز باشد.";

        /// <summary>
        /// فروش را از پیش‌فاکتور خارج می‌کند: اگر هنوز شماره‌ی رسمی ندارد یکی تولید می‌کند و
        /// تاریخ فاکتور را می‌نشاند، و وضعیت را به PROCESSING می‌برد. شرطِ «آیا مجاز است؟»
        /// بیرون از اینجا تصمیم گرفته می‌شود - فروش عادی با اولین پرداخت (PaidAmount > 0)، فروش اقساطی با وجود
        /// پلن فعال و ثبت پیش‌پرداخت.
        ///
        /// Invoice date: <paramref name="invoiceDate"/> when the issuing request names one, else the date already on the proforma
        /// (CreateSale/UpdateSale accept one) unless it lies in the future, else now. It is fixed from here on: the customer's
        /// account row and the tax period are dated by it.
        /// </summary>
        public static async Task FinalizeAsync(IWMSDbContext context, Domain.Entities.Sale sale, DateTime? invoiceDate, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(sale.InvoiceNumber))
            {
                sale.InvoiceNumber = await NextInvoiceNumberAsync(context, cancellationToken);
                var now = DateTime.Now;
                sale.InvoiceDate = invoiceDate
                    ?? (sale.InvoiceDate.HasValue && sale.InvoiceDate.Value.Date <= now.Date ? sale.InvoiceDate : now);

                if (sale.PaymentDate.HasValue && sale.PaymentDate.Value.Date < sale.InvoiceDate!.Value.Date)
                    throw new ValidationCustomException("مهلت پرداخت این فروش قبل از تاریخ فاکتور است؛ ابتدا مهلت پرداخت را اصلاح کنید.");
            }

            if (sale.Status == SalesStatusEnum.PROFORMA)
            {
                sale.Status = SalesStatusEnum.PROCESSING;
                // Paid for: the reserved units now wait for shipping, not for the customer.
                sale.ReservationExpiresAt = null;
                ApplyPaymentType(sale);
                // Issuing the invoice is what puts it on the customer's account.
                await PartyLedger.SaleInvoiceIssuedAsync(context, sale, sale.InvoiceDate ?? DateTime.Now, cancellationToken);
            }
        }

        /// <summary>
        /// A sale paid in full says how it was paid: the one method of its payment rows, or MIXED when there are several. The type
        /// chosen on the proforma was only the plan ("credit"), and a sale paid at once in cash must not stay labelled credit.
        /// Installment sales and sales not yet paid in full keep their type - an unpaid remainder still is what the type says.
        /// Reads the sale's loaded PaymentDetails and, when their payment rows are loaded, its on-account allocations.
        /// </summary>
        public static void ApplyPaymentType(Domain.Entities.Sale sale)
        {
            if (sale.PaymentType == PaymentTypeEnum.INSTALLMENT || sale.PaidAmount < sale.TotalAmount)
                return;

            var types = sale.PaymentDetails
                .Where(p => p.VoidedAt == null && p.Direction == PaymentDirectionEnum.IN && p.Purpose == PaymentPurposeEnum.NORMAL)
                .Select(p => p.Type)
                .Concat(sale.PaymentAllocations
                    .Where(a => a.VoidedAt == null && a.PaymentDetail != null)
                    .Select(a => a.PaymentDetail.Type))
                .Distinct()
                .ToList();

            if (types.Count > 0)
                sale.PaymentType = types.Count == 1 ? types[0] : PaymentTypeEnum.MIXED;
        }
    }
}
