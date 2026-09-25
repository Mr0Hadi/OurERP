using Domain.Enums;

namespace Application.Common.Dtos
{
    public class PaymentDetailDto
    {
        /// <summary>
        /// از <c>Guid</c> به <c>int</c> تغییر کرده (۱۴۰۵/۰۶/۲۹) - همه‌ی شناسه‌های این پروژه int هستند.
        /// تغییر شکسته روی wire؛ در docs/api-guide.fa.md بخش ۱۶ ثبت شده است.
        /// </summary>
        public int Id { get; set; }

        /// <summary>«چطور پرداخت شد».</summary>
        public PaymentTypeEnum Type { get; set; }

        /// <summary>«این پرداخت چیست» - پیش‌فرض پرداخت عادی.</summary>
        public PaymentPurposeEnum Purpose { get; set; }

        /// <summary>
        /// Read only: IN = money we received, OUT = money we paid. On CreateSale/CreatePurchase it is ignored - a row
        /// sent there is always in the document's own direction (sale IN, purchase OUT); refunds go through
        /// AddSalePayment/AddPurchasePayment.
        /// </summary>
        public PaymentDirectionEnum Direction { get; set; }

        public decimal Amount { get; set; }

        /// <summary>Read only: set when the row was voided. A voided row stays in the list and no longer counts.</summary>
        public DateTime? VoidedAt { get; set; }

        /// <summary>تاریخ واقعی پرداخت.</summary>
        public DateTime PaidAt { get; set; }

        public string? CheckNumber { get; set; }
        public string? TransferRef { get; set; }
    }
}
