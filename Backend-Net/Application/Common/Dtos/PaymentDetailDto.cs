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

        public decimal Amount { get; set; }

        /// <summary>تاریخ واقعی پرداخت.</summary>
        public DateTime PaidAt { get; set; }

        public string? CheckNumber { get; set; }
        public string? TransferRef { get; set; }
    }
}
