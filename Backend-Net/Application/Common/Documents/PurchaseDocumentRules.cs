using Application.Common.Contracts.Context;
using Domain.Enums;
using System.Linq.Expressions;

namespace Application.Common.Documents
{
    /// <summary>
    /// What a purchase allows, in one place (frontend-requests 13.1). Each method returns the Persian reason the action is
    /// refused, or null when it is allowed. The commands throw that reason, and PurchaseDetailReader turns the same calls
    /// into the canDelete/canCancel/allowedStatuses/canCreateReturn/items[].canClose/canReopen flags, so a button is never
    /// offered for something the server refuses (the pattern the return documents already follow, ReturnLifecycleRules).
    /// Pure: the caller loads the facts.
    /// </summary>
    public static class PurchaseDocumentRules
    {
        /// <summary>DeletePurchase. <paramref name="ownNetPaid"/>: the document's own live payment rows (allocations are released, not blocking).</summary>
        public static string? DeleteBlocker(PurchaseStatusEnum status, ulong ownNetPaid)
        {
            if (status != PurchaseStatusEnum.PROFORMA)
                return "فقط پیش‌فاکتور حذف می‌شود؛ خرید صادرشده را لغو کنید.";
            if (ownNetPaid > 0)
                return "این پیش‌فاکتور پرداخت ثبت‌شده دارد؛ ابتدا پرداخت‌ها را ابطال کنید.";
            return null;
        }

        /// <summary>ChangePurchaseStatus to <paramref name="target"/> (PENDING, SHIPPED or CANCELLED).</summary>
        public static string? StatusChangeBlocker(PurchaseStatusEnum status, PurchaseStatusEnum target, bool hasInvoiceNumberAndDate, bool anythingReceived)
        {
            if (target is not (PurchaseStatusEnum.PENDING or PurchaseStatusEnum.SHIPPED or PurchaseStatusEnum.CANCELLED))
                return "وضعیت خرید را فقط می‌توان به در انتظار، ارسال‌شده یا لغوشده تغییر داد.";
            if (status == PurchaseStatusEnum.CANCELLED)
                return "خرید لغوشده قابل تغییر وضعیت نیست.";
            if (status is PurchaseStatusEnum.PARTIALLY_RECEIVED or PurchaseStatusEnum.RECEIVED)
                return "وضعیت خریدی که کالایش دریافت شده از روی دریافت‌ها حساب می‌شود و دستی تغییر نمی‌کند.";

            if (target == PurchaseStatusEnum.CANCELLED)
                return anythingReceived
                    ? "کالای این خرید دریافت شده و قابل لغو نیست؛ از مسیر مرجوعی یا بستن ردیف اقدام کنید."
                    : null;

            if (status == PurchaseStatusEnum.PROFORMA && !hasInvoiceNumberAndDate)
                return "برای خروج از پیش‌فاکتور، ابتدا شماره و تاریخ فاکتور تامین‌کننده را در پیش‌فاکتور ثبت کنید.";
            return null;
        }

        /// <summary>
        /// The manual targets ChangePurchaseStatus would accept now, other than the current status and other than CANCELLED
        /// (which has its own flag, canCancel).
        /// </summary>
        public static List<PurchaseStatusEnum> AllowedStatuses(PurchaseStatusEnum status, bool hasInvoiceNumberAndDate, bool anythingReceived) =>
            new[] { PurchaseStatusEnum.PENDING, PurchaseStatusEnum.SHIPPED }
                .Where(t => t != status && StatusChangeBlocker(status, t, hasInvoiceNumberAndDate, anythingReceived) == null)
                .ToList();

        /// <summary>
        /// CreatePurchaseReturn: not on a cancelled purchase, and only once something arrived - received on a line, or held
        /// as a unit of this purchase (excess/unlisted goods sit in quarantine without touching any line's ReceivedQuantity).
        /// </summary>
        public static string? CreateReturnBlocker(PurchaseStatusEnum status, bool anythingArrived)
        {
            if (status == PurchaseStatusEnum.CANCELLED)
                return "امکان ثبت مرجوعی برای خرید لغوشده وجود ندارد.";
            if (!anythingArrived)
                return "هنوز هیچ کالایی از این خرید دریافت نشده و چیزی برای مرجوع کردن وجود ندارد.";
            return null;
        }

        /// <summary>The SQL form of <see cref="CreateReturnBlocker"/> == null, for GetPurchaseList's Returnable filter (13.3).</summary>
        public static Expression<Func<Domain.Entities.Purchase, bool>> IsReturnable(IWMSDbContext context) =>
            p => p.Status != PurchaseStatusEnum.CANCELLED
                 && (p.Items.Any(i => i.ReceivedQuantity > 0) || context.ProductUnits.Any(u => u.PurchaseId == p.Id));

        /// <summary>The "anything arrived" fact of <see cref="CreateReturnBlocker"/>, read the same way <see cref="IsReturnable"/> does.</summary>
        public static async Task<bool> AnythingArrivedAsync(IWMSDbContext context, int purchaseId, CancellationToken cancellationToken) =>
            await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.AnyAsync(
                context.Purchases.Where(p => p.Id == purchaseId && (p.Items.Any(i => i.ReceivedQuantity > 0) || context.ProductUnits.Any(u => u.PurchaseId == p.Id))),
                cancellationToken);

        /// <summary>ClosePurchaseItem.</summary>
        public static string? CloseItemBlocker(PurchaseStatusEnum status, bool anythingReceived, int shortClosedQuantity, int stillOwedQuantity)
        {
            if (status == PurchaseStatusEnum.CANCELLED)
                return "قلمِ خرید لغوشده قابل بستن نیست.";
            // Short close ends a delivery that has started. Before anything arrived there is no delivery to end: the order itself
            // is still open to change (UpdatePurchase) or to cancel. Without this, closing every line of a PROFORMA/PENDING
            // purchase made it RECEIVED with nothing received and no invoice number ever required.
            if (!anythingReceived)
                return "هنوز هیچ کالایی از این خرید دریافت نشده است؛ به‌جای بستنِ قلم، سفارش را ویرایش یا لغو کنید.";
            if (shortClosedQuantity > 0)
                return "این قلم قبلاً بسته شده است.";
            if (stillOwedQuantity == 0)
                return "همه‌ی مقدار این قلم دریافت شده و چیزی برای بستن باقی نمانده است.";
            return null;
        }

        /// <summary>ReopenPurchaseItem.</summary>
        public static string? ReopenItemBlocker(PurchaseStatusEnum status, int shortClosedQuantity)
        {
            if (status == PurchaseStatusEnum.CANCELLED)
                return "قلمِ خرید لغوشده قابل بازگشایی نیست.";
            if (shortClosedQuantity == 0)
                return "این قلم بسته نشده است.";
            return null;
        }
    }
}
