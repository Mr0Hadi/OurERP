using Domain.Enums;

namespace Application.Common.Dtos
{
    public class PaymentDetailDto : Application.Common.Payments.IPosPaymentFields
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

        /// <summary>Card-reader details, TRANSFER rows only (see IPosPaymentFields).</summary>
        public int? PosTerminalId { get; set; }
        public string? MaskedCardNumber { get; set; }
        public string? ApprovalCode { get; set; }
        public string? TraceNumber { get; set; }

        /// <summary>Read only. Card-reader rows: DEVICE or MANUAL_RECEIPT; null otherwise.</summary>
        public PaymentSourceEnum? Source { get; set; }

        /// <summary>Read only: when and by whom the row was recorded (null on rows older than 2026-10-05).</summary>
        public DateTime? RecordedAt { get; set; }
        public int? RecordedByUserId { get; set; }
        public string? RecordedByName { get; set; }
    }
}
