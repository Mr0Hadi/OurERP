using Common.Exceptions;
using Domain.Enums;

namespace Application.Common.Documents
{
    /// <summary>
    /// A sale or purchase is a draft only while it is a PROFORMA: everything on it can change. Once it leaves PROFORMA it
    /// is an issued invoice and nothing on it is edited again - only payments, status, attachments and the payment due
    /// date stay open, each through its own command. A mistake on an issued invoice is corrected by cancelling and
    /// issuing a new one (nothing moved yet) or through a return (goods moved), never by editing.
    /// Leaving PROFORMA is one-way: a sale leaves on its first payment, a purchase when the supplier's official invoice
    /// is recorded.
    /// </summary>
    public static class DocumentLockRules
    {
        private const string IssuedMessage =
            "این سند از مرحله‌ی پیش‌فاکتور خارج شده و دیگر قابل ویرایش نیست. برای اصلاح، اگر کالایی جابه‌جا نشده سند را لغو و دوباره ثبت کنید، وگرنه از مسیر مرجوعی اقدام کنید.";

        public static void EnsureDraft(PurchaseStatusEnum status)
        {
            if (status != PurchaseStatusEnum.PROFORMA)
                throw new ValidationCustomException(IssuedMessage);
        }

        public static void EnsureDraft(SalesStatusEnum status)
        {
            if (status != SalesStatusEnum.PROFORMA)
                throw new ValidationCustomException(IssuedMessage);
        }

        /// <summary>
        /// Statuses a person may choose for a purchase. PARTIALLY_RECEIVED/RECEIVED are computed from receiving
        /// (RecomputePurchaseStatus) and CANCELLED has its own rules in ChangePurchaseStatus.
        /// </summary>
        public static bool IsManualPurchaseStatus(PurchaseStatusEnum status) =>
            status is PurchaseStatusEnum.PROFORMA or PurchaseStatusEnum.PENDING or PurchaseStatusEnum.SHIPPED;
    }
}
