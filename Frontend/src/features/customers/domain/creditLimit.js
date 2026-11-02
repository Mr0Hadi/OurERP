import { PaymentTypeEnum } from "@/shared/domain/enums/paymentType";

/**
 * سقفِ اعتبارِ مشتری (GAP-06، بخشِ ۴ api-guide «سقف اعتبار»). تصمیم با سرور است: هر ذخیره‌ای که فاکتور صادر کند و
 * بدهیِ مؤثرِ مشتری (مانده‌ی دفتر + چک‌های وصول‌نشده) را از سقف بالاتر ببرد رد می‌شود؛ راهِ دور زدن ندارد. این‌جا
 * فقط هشدارِ پیش از ثبت و خواندنِ پاسخِ رد است.
 *
 * `creditLimit`: `null` = بی‌سقف، `0` = فقط نقدی، عدد = سقفِ بدهی (ریال).
 */

/** پولی که همین حالا رسیده و از نسیه کم می‌کند: نقد و کارت/انتقال. چک تا وصول نسیه است. */
const SETTLES_NOW = new Set([PaymentTypeEnum.CASH, PaymentTypeEnum.TRANSFER]);

/** جمعِ دریافت‌های نقد/کارت/انتقالِ زنده‌ی این فرم (ردیف‌های `usePaymentDraft`)، با علامتِ جهت. */
export function settledNowOf(rows = [], direction) {
  return rows.reduce((sum, row) => {
    if (row.voidedAt || row.pending === "void" || !SETTLES_NOW.has(Number(row.type))) return sum;
    const amount = Number(row.amount) || 0;
    return sum + (row.direction == null || row.direction === direction ? amount : -amount);
  }, 0);
}

/** آیا روشِ پرداختِ این ردیف همین حالا تسویه می‌کند (برای پیش‌پرداختِ قرارداد)؟ */
export const settlesNow = (paymentType) => SETTLES_NOW.has(Number(paymentType));

/**
 * هشدارِ زنده: نسیه‌ی این فاکتور (= قابل پرداخت − نقد/کارتِ همین فرم) با اعتبارِ ماندهٔ مشتری سنجیده می‌شود.
 *
 * @param customer `GetCustomerDetail` (`creditLimit`، `creditAvailable`)
 * @returns `null` اگر مشکلی نیست؛ وگرنه `{ cashOnly, credit, available, excess, minCash }`
 */
export function creditCheck({ customer, payable, settledNow = 0 }) {
  if (customer?.creditLimit == null) return null;
  const credit = Math.max(0, (Number(payable) || 0) - (Number(settledNow) || 0));
  if (credit === 0) return null;
  const limit = Number(customer.creditLimit) || 0;
  const available = customer.creditAvailable != null ? Number(customer.creditAvailable) : limit;
  if (credit <= available) return null;
  const excess = credit - available;
  return {
    cashOnly: limit === 0,
    credit,
    available,
    excess,
    // مشتریِ بالای سقف هنوز می‌تواند کامل نقد بخرد؛ بیشتر از کلِ نسیه لازم نیست.
    minCash: Math.min(excess, credit),
  };
}

/**
 * پاسخِ ردِ سقفِ اعتبار از سرور، یا `null`. بدنه‌ی خطا PascalCase است (`ExceptionHandlingMiddleware`):
 * `{ Message, Data: { CreditLimitExceeded, CustomerId, CustomerName, CreditLimit, CurrentExposure,
 * UnclearedCheques, AddedAmount, Exposure, Excess } }`.
 */
export function creditRefusalOf(error) {
  const body = error?.response?.data;
  const data = body?.Data ?? body?.data;
  if (!(data?.CreditLimitExceeded ?? data?.creditLimitExceeded)) return null;
  const read = (key) => data[key] ?? data[key.charAt(0).toLowerCase() + key.slice(1)];
  return {
    message: body.Message ?? body.message ?? "",
    customerId: read("CustomerId"),
    customerName: read("CustomerName"),
    creditLimit: Number(read("CreditLimit")) || 0,
    currentExposure: Number(read("CurrentExposure")) || 0,
    unclearedCheques: Number(read("UnclearedCheques")) || 0,
    addedAmount: Number(read("AddedAmount")) || 0,
    exposure: Number(read("Exposure")) || 0,
    excess: Number(read("Excess")) || 0,
  };
}
