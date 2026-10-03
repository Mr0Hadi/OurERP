import { PaymentTypeEnum } from "@/shared/domain/enums/paymentType";
import { nowLocalIso } from "@/shared/lib/dateUtils";

/**
 * ردیف‌های پرداختِ سندِ خرید/فروش — تبدیل‌های خالص بینِ پیش‌نویسِ فرم
 * (`usePaymentDraft`) و بدنه‌ی API. بی React، تا سرویس‌ها و storeها هم
 * بتوانند از آن بخوانند.
 */

/** پیش‌نویسِ خالیِ پرداخت‌ها: `{ changes: { [paymentId]: … }, added: [{ id, values }] }`. */
export const EMPTY_PAYMENT_DRAFT = Object.freeze({ changes: {}, added: [] });

/**
 * بدنه‌ی API برای یک ردیفِ پرداخت؛ مرجعِ چک/حواله فقط برای همان روش.
 * `withDirection: false` برای جایی که سرور جهت را خودش می‌گذارد (ثبتِ سند،
 * اصلاحِ پرداخت).
 */
export function toPaymentPayload(values, { withDirection = true } = {}) {
  return {
    type: values.type,
    amount: Number(values.amount) || 0,
    paidAt: values.paidAt || undefined,
    ...(withDirection && { direction: values.direction }),
    checkNumber: values.type === PaymentTypeEnum.CHECK ? values.checkNumber || undefined : undefined,
    transferRef:
      values.type === PaymentTypeEnum.TRANSFER ? values.transferRef || undefined : undefined,
  };
}

/**
 * ردیف‌های پرداختِ همراهِ ثبتِ سند (`paymentDetails`ِ `Create*`): جهت را
 * خودِ سرور می‌گذارد، ردیفِ بی‌مبلغ فرستاده نمی‌شود و تاریخِ خالی یعنی همین حالا.
 */
export function toApiPaymentRows(rows = []) {
  const now = nowLocalIso();
  return rows
    .map((row) => {
      const payload = toPaymentPayload(row, { withDirection: false });
      return { ...payload, paidAt: payload.paidAt || now };
    })
    .filter((row) => row.amount > 0);
}

/**
 * «شرایط پرداخت»ِ سند از روی ردیف‌ها: بدون ردیف یعنی نسیه، یک روش یعنی همان،
 * چند روش یعنی ترکیبی. دیگر جدا از کاربر پرسیده نمی‌شود.
 */
export function paymentTypeOf(rows) {
  const live = rows.filter((row) => !row.voidedAt && row.pending !== "void");
  const types = [...new Set(live.map((row) => row.type))];
  if (types.length === 0) return PaymentTypeEnum.CREDIT;
  if (types.length === 1) return types[0];
  return PaymentTypeEnum.MIXED;
}
