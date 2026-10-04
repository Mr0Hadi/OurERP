using Domain.Enums;

namespace Domain.Entities
{
    /// <summary>
    /// یک رکورد مالی واقعی: پولی که جابه‌جا شده. می‌تواند به یک خرید یا یک فروش وصل باشد
    /// (نه هر دو، ولی مدل اجباری نمی‌کند - هر دو FK اختیاری‌اند).
    /// </summary>
    public class PaymentDetail
    {
        public int Id { get; set; }

        public int? PurchaseId { get; set; }
        public Purchase? Purchase { get; set; }

        public int? SaleId { get; set; }
        public Sale? Sale { get; set; }

        /// <summary>«چطور پرداخت شد» - نقد/چک/انتقال/... .</summary>
        public PaymentTypeEnum Type { get; set; }

        /// <summary>«این پرداخت چیست» - پرداخت عادی، پیش‌پرداخت قرارداد اقساطی، یا پرداخت قسط.</summary>
        public PaymentPurposeEnum Purpose { get; set; }

        /// <summary>
        /// «پول به کدام سمت رفت» - از دید ما، نه نسبت به سند: پرداخت مشتری و پول برگشتی تامین‌کننده هر دو IN‌اند.
        /// </summary>
        public PaymentDirectionEnum Direction { get; set; }

        public decimal Amount { get; set; }

        /// <summary>
        /// ردیف پرداخت هیچ‌وقت پاک نمی‌شود: ابطال فقط این تاریخ را می‌نشاند و ردیف از جمع
        /// PaidAmount بیرون می‌رود. ویرایش = ابطال + ردیف تازه.
        /// </summary>
        public DateTime? VoidedAt { get; set; }

        /// <summary>تاریخ واقعی پرداخت.</summary>
        public DateTime PaidAt { get; set; }

        public string? CheckNumber { get; set; }
        public string? TransferRef { get; set; }

        /// <summary>The card reader the money was taken on (TRANSFER rows only). Restrict: a device is only ever deactivated.</summary>
        public int? PosTerminalId { get; set; }
        public PosTerminal? PosTerminal { get; set; }

        /// <summary>Masked as the device prints it (first six and last four digits at most) - never the full card number.</summary>
        public string? MaskedCardNumber { get; set; }
        public string? ApprovalCode { get; set; }
        public string? TraceNumber { get; set; }

        /// <summary>Card-reader rows only (null otherwise): from the device, or typed in from the receipt. Set by the server.</summary>
        public PaymentSourceEnum? Source { get; set; }

        /// <summary>
        /// When the row was written and by whom - stamped by WMSDbContext on insert, for every payment row
        /// (installments included). Null on rows recorded before 2026-10-05, and on rows written outside a request.
        /// </summary>
        public DateTime? RecordedAt { get; set; }
        public int? RecordedByUserId { get; set; }
        public User? RecordedByUser { get; set; }
    }
}
