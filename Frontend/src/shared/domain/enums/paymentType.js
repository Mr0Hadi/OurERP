/**
 * `PaymentTypeEnum` — تنها واژگانِ «پول از چه راهی جابه‌جا می‌شود» در کل
 * فرانت. مقادیر باید دقیقاً با اعداد بکند یکی بمانند؛ روی سیم همیشه
 * عدد است.
 *
 * سه جا از همین یکی استفاده می‌کنند:
 *
 *   • `paymentType`ِ سندِ خرید/فروش،
 *   • `type`ِ هر ردیف در `paymentDetails` (پرداختِ ترکیبیِ سند)،
 *   • `method`ِ هر اثرِ پولیِ مرجوعی و تکه‌های آن.
 *
 * هر سه با همین شماره‌ها می‌شمارند و هیچ نگاشتی بینشان لازم نیست — به
 * همین دلیل `MixedPaymentList`ِ مشترک می‌تواند به هر سه سرویس بدهد
 * بدون اینکه معنیِ خروجی‌اش به مصرف‌کننده بستگی داشته باشد.
 *
 * شماره‌گذاری عیناً همان `Domain.Enums.PaymentTypeEnum`ِ بکند است.
 * `INSTALLMENT` («اقساطی») فقط روی فروش معنا دارد — بکند خرید اقساطی
 * ندارد — و مرجوعی هم هرگز آن را به‌عنوان روش نمی‌پذیرد
 * (`RETURN_PAYMENT_METHODS` را ببینید).
 */
export const PaymentTypeEnum = Object.freeze({
  CASH: 0,
  CREDIT: 1,
  CHECK: 2,
  TRANSFER: 3,
  MIXED: 4,
  INSTALLMENT: 5,
});

export const PAYMENT_TYPE_LABELS = Object.freeze({
  [PaymentTypeEnum.CASH]: "نقدی",
  [PaymentTypeEnum.CREDIT]: "نسیه",
  [PaymentTypeEnum.CHECK]: "چک",
  [PaymentTypeEnum.TRANSFER]: "انتقال بانکی",
  [PaymentTypeEnum.MIXED]: "ترکیبی",
  [PaymentTypeEnum.INSTALLMENT]: "اقساطی",
});

/**
 * نوع‌هایی که یک *سندِ* خرید/فروش می‌تواند داشته باشد.
 *
 * `INSTALLMENT` عمداً بیرون است: خرید اقساطی در بکند وجود ندارد و فروشِ
 * اقساطی برنامه‌ی اقساط می‌خواهد که این فرم نمی‌سازد.
 */
export const DOCUMENT_PAYMENT_TYPES = Object.freeze([
  PaymentTypeEnum.CASH,
  PaymentTypeEnum.CREDIT,
  PaymentTypeEnum.CHECK,
  PaymentTypeEnum.TRANSFER,
  PaymentTypeEnum.MIXED,
]);

/** فقط برچسبِ نوع‌های سطحِ سند — برای کشویی‌های «نوع پرداخت» و فیلترها. */
export const DOCUMENT_PAYMENT_TYPE_LABELS = Object.freeze(
  Object.fromEntries(
    DOCUMENT_PAYMENT_TYPES.map((value) => [value, PAYMENT_TYPE_LABELS[value]]),
  ),
);

/**
 * روش‌هایی که یک اثرِ پولیِ مرجوعی می‌تواند داشته باشد — مقادیرِ معتبرِ
 * `ReturnPaymentMethodEnum`ِ بکند منهای «اعتبار خرید بعدی» که در فرانت
 * پشتیبانی نمی‌شود.
 */
export const RETURN_PAYMENT_METHODS = Object.freeze([
  PaymentTypeEnum.CASH,
  PaymentTypeEnum.CREDIT,
  PaymentTypeEnum.CHECK,
  PaymentTypeEnum.TRANSFER,
  PaymentTypeEnum.MIXED,
]);

/**
 * روش‌هایی که یک شماره‌ی پیگیری همراه دارند، و نامِ فیلدی که آن شماره
 * در آن می‌نشیند — همان نامی که بکند در `paymentDetails` می‌شناسد.
 */
export const PAYMENT_REFERENCE_FIELDS = Object.freeze({
  [PaymentTypeEnum.CHECK]: { field: "checkNumber", label: "شماره چک" },
  [PaymentTypeEnum.TRANSFER]: { field: "transferRef", label: "شماره پیگیری" },
});

/**
 * روش‌هایی که یک مبلغ می‌تواند بینشان تقسیم شود. «نسیه» و «اقساطی»
 * اینجا نیستند چون خودشان یعنی «الان پولی جابه‌جا نمی‌شود» —
 * تکه‌کردنشان بی‌معناست. «ترکیبی» هم خودِ ظرف است، نه یک تکه.
 */
export const SPLITTABLE_PAYMENT_TYPES = Object.freeze([
  PaymentTypeEnum.CASH,
  PaymentTypeEnum.CHECK,
  PaymentTypeEnum.TRANSFER,
]);
