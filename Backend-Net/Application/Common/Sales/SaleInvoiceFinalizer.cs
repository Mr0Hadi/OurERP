using Application.Common.Contracts.Context;
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
        /// فروش را از پیش‌فاکتور خارج می‌کند: اگر هنوز شماره‌ی رسمی ندارد یکی تولید می‌کند و
        /// تاریخ فاکتور را می‌نشاند، و وضعیت را به PROCESSING می‌برد. شرطِ «آیا مجاز است؟»
        /// بیرون از اینجا تصمیم گرفته می‌شود - فروش عادی با پرداخت کامل، فروش اقساطی با وجود
        /// پلن فعال و ثبت پیش‌پرداخت.
        /// </summary>
        public static async Task FinalizeAsync(IWMSDbContext context, Domain.Entities.Sale sale, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(sale.InvoiceNumber))
            {
                sale.InvoiceNumber = await NextInvoiceNumberAsync(context, cancellationToken);
                sale.InvoiceDate = DateTime.Now;
            }

            if (sale.Status == SalesStatusEnum.PROFORMA)
                sale.Status = SalesStatusEnum.PROCESSING;
        }
    }
}
