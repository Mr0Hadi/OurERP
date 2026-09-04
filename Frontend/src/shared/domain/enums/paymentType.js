// src/shared/domain/enums/paymentType.js

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
 * تا پیش از این، سومی شمارشِ جداگانه‌ای داشت (`PAYMENT_METHODS`، قرینه‌ی
 * `ReturnPaymentMethodEnum`ِ بکند) که معنی‌هایش همین بود ولی
 * شماره‌گذاری‌اش قاطی — «چک» آنجا ۱ بود و اینجا ۲. نتیجه‌اش این بود که
 * `MixedPaymentList`ِ مشترک بسته به مصرف‌کننده دو معنیِ متفاوت تولید
 * می‌کرد و هر عبور از مرز یک نگاشت لازم داشت. حالا یکی است.
 *
 * `STORE_CREDIT` («اعتبار خرید بعدی») تنها عضوی است که فقط در مرجوعی
 * معنا دارد؛ سندِ خرید/فروش هرگز آن را نمی‌سازد.
 *
 * ⚠️ این شماره‌گذاری فرض می‌کند بکند هم `ReturnPaymentMethodEnum` را با
 * همین ترتیب یکی کرده باشد — به `Backend-Net/docs/payment-enum-unification.fa.md`
 * نگاه کنید.
 */
export const PaymentTypeEnum = Object.freeze({
  CASH: 0,
  CREDIT: 1,
  CHECK: 2,
  TRANSFER: 3,
  MIXED: 4,
  STORE_CREDIT: 5,
});

export const PAYMENT_TYPE_LABELS = Object.freeze({
  [PaymentTypeEnum.CASH]: "نقدی",
  [PaymentTypeEnum.CREDIT]: "نسیه",
  [PaymentTypeEnum.CHECK]: "چک",
  [PaymentTypeEnum.TRANSFER]: "انتقال بانکی",
  [PaymentTypeEnum.MIXED]: "ترکیبی",
  [PaymentTypeEnum.STORE_CREDIT]: "اعتبار خرید بعدی",
});

/**
 * نوع‌هایی که یک *سندِ* خرید/فروش می‌تواند داشته باشد.
 *
 * `STORE_CREDIT` عمداً بیرون است: «اعتبار خرید بعدی» تعهدی است که فقط
 * از یک مرجوعی زاده می‌شود، نه راهی که فاکتور با آن تسویه شود. بدون
 * این فهرست، با یکی‌شدنِ شمارش‌ها همین عضو در کشویی «نوع پرداخت» فرمِ
 * خرید ظاهر می‌شد.
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
 * روش‌هایی که یک شماره‌ی پیگیری همراه دارند، و نامِ فیلدی که آن شماره
 * در آن می‌نشیند — همان نامی که بکند در `paymentDetails` می‌شناسد.
 */
export const PAYMENT_REFERENCE_FIELDS = Object.freeze({
  [PaymentTypeEnum.CHECK]: { field: "checkNumber", label: "شماره چک" },
  [PaymentTypeEnum.TRANSFER]: { field: "transferRef", label: "شماره پیگیری" },
});

/**
 * روش‌هایی که یک مبلغ می‌تواند بینشان تقسیم شود. «نسیه» و «اعتبار خرید
 * بعدی» اینجا نیستند چون خودشان یعنی «الان پولی جابه‌جا نمی‌شود» —
 * تکه‌کردنشان بی‌معناست. «ترکیبی» هم خودِ ظرف است، نه یک تکه.
 */
export const SPLITTABLE_PAYMENT_TYPES = Object.freeze([
  PaymentTypeEnum.CASH,
  PaymentTypeEnum.CHECK,
  PaymentTypeEnum.TRANSFER,
]);
