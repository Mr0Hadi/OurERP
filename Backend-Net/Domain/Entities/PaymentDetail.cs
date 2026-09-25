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
    }
}
