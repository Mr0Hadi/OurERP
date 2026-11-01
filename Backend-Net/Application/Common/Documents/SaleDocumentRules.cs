using Application.Common.Sales;
using Domain.Enums;
using System.Linq.Expressions;

namespace Application.Common.Documents
{
    /// <summary>
    /// What a sale allows, in one place (frontend-requests 13.1) - the sale twin of <see cref="PurchaseDocumentRules"/>. Each
    /// method returns the Persian reason the action is refused, or null when it is allowed; the commands throw it and
    /// SaleDetailReader turns the same calls into canDelete/canCancel/allowedStatuses/canCreateReturn. Pure.
    /// </summary>
    public static class SaleDocumentRules
    {
        /// <summary>The statuses CreateSaleReturn accepts: something has left for the customer.</summary>
        public static readonly IReadOnlyCollection<SalesStatusEnum> ReturnableStatuses = new HashSet<SalesStatusEnum>
        {
            SalesStatusEnum.SHIPPED,
            SalesStatusEnum.PARTIALLY_DELIVERED,
            SalesStatusEnum.DELIVERED,
        };

        /// <summary>DeleteSale. <paramref name="hasInstallmentPlan"/>: any live plan, active or not.</summary>
        public static string? DeleteBlocker(SalesStatusEnum status, bool hasInstallmentPlan)
        {
            if (status != SalesStatusEnum.PROFORMA)
                return "فقط پیش‌فاکتور حذف می‌شود؛ فروش صادرشده را لغو کنید.";
            if (hasInstallmentPlan)
                return "این پیش‌فاکتور قرارداد اقساطی دارد؛ ابتدا قرارداد را حذف کنید.";
            return null;
        }

        /// <summary>
        /// ChangeSaleStatus to <paramref name="target"/>. <paramref name="sale"/> must carry Status, PaymentType, ProformaStage,
        /// ReservationExpiresAt and Items (ShippedQuantity); <paramref name="hasActivePlan"/> is read only for CANCELLED.
        /// </summary>
        public static string? StatusChangeBlocker(Domain.Entities.Sale sale, SalesStatusEnum target, bool hasActivePlan, DateTime now)
        {
            if (target is not (SalesStatusEnum.PROCESSING or SalesStatusEnum.DELIVERED or SalesStatusEnum.CANCELLED))
                return "وضعیت فروش را فقط می‌توان به صدور فاکتور، تحویل‌شده یا لغوشده تغییر داد.";
            if (sale.Status == SalesStatusEnum.CANCELLED)
                return "فروش لغوشده قابل تغییر وضعیت نیست.";

            switch (target)
            {
                case SalesStatusEnum.PROCESSING:
                    // A credit sale: the invoice is issued and goes on the customer's account with nothing paid. Only after the
                    // customer and the warehouse have approved it - the same gate a payment passes.
                    if (sale.Status != SalesStatusEnum.PROFORMA)
                        return "فاکتور این فروش قبلاً صادر شده است.";
                    if (sale.PaymentType == PaymentTypeEnum.INSTALLMENT)
                        return "فاکتور فروش اقساطی با ثبت قرارداد و پیش‌پرداخت صادر می‌شود.";
                    return SaleProformaPipeline.ReadyForPaymentBlocker(sale, now);

                case SalesStatusEnum.DELIVERED:
                    return sale.Status != SalesStatusEnum.SHIPPED
                        ? "فقط فروشی که همه‌ی کالایش ارسال شده تحویل‌شده ثبت می‌شود."
                        : null;

                default:
                    if (sale.Items.Any(i => i.ShippedQuantity > 0))
                        return "کالای این فروش ارسال شده و قابل لغو نیست؛ از مسیر مرجوعی اقدام کنید.";
                    if (hasActivePlan)
                        return "این فروش قرارداد اقساطی فعال دارد؛ ابتدا قرارداد را لغو کنید.";
                    return null;
            }
        }

        /// <summary>The manual targets ChangeSaleStatus would accept now, other than CANCELLED (its own flag, canCancel).</summary>
        public static List<SalesStatusEnum> AllowedStatuses(Domain.Entities.Sale sale, DateTime now) =>
            new[] { SalesStatusEnum.PROCESSING, SalesStatusEnum.DELIVERED }
                .Where(t => t != sale.Status && StatusChangeBlocker(sale, t, hasActivePlan: false, now) == null)
                .ToList();

        /// <summary>CreateSaleReturn.</summary>
        public static string? CreateReturnBlocker(SalesStatusEnum status) =>
            ReturnableStatuses.Contains(status) ? null : "فقط فروش‌های ارسال‌شده یا تحویل‌شده قابل مرجوع کردن هستند.";

        /// <summary>The SQL form of <see cref="CreateReturnBlocker"/> == null, for GetSaleList's Returnable filter (13.3).</summary>
        public static Expression<Func<Domain.Entities.Sale, bool>> IsReturnable =>
            s => s.Status == SalesStatusEnum.SHIPPED || s.Status == SalesStatusEnum.PARTIALLY_DELIVERED || s.Status == SalesStatusEnum.DELIVERED;
    }
}
