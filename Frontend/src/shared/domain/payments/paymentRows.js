import { PaymentTypeEnum } from "@/shared/domain/enums/paymentType";
import { PaymentPurposeEnum } from "@/shared/domain/enums/paymentDirection";
import { ChequeStatusEnum } from "@/shared/domain/enums/chequeStatus";
import { nowLocalIso } from "@/shared/lib/dateUtils";

/**
 * ردیف‌های پرداختِ سندِ خرید/فروش — تبدیل‌های خالص بینِ پیش‌نویسِ فرم
 * (`usePaymentDraft`) و بدنه‌ی API. بی React، تا سرویس‌ها و storeها هم
 * بتوانند از آن بخوانند.
 */

/** پیش‌نویسِ خالیِ پرداخت‌ها: `{ changes: { [paymentId]: … }, added: [{ id, values }] }`. */
export const EMPTY_PAYMENT_DRAFT = Object.freeze({ changes: {}, added: [] });

/** فیلدهای تکمیلیِ چک روی هر ثبتِ پول (`api-guide` بخش ۲۴)؛ شماره‌ی چک جدا، در `checkNumber`. */
export const EMPTY_CHEQUE_FIELDS = Object.freeze({ checkDueDate: "", checkBankName: "", checkDrawerName: "" });

/**
 * فیلدهای تکمیلیِ چک برای بدنه‌ی API — فقط برای `CHECK` (برای روش‌های دیگر سرور ۴۰۰ می‌دهد)؛ خالی‌ها فرستاده
 * نمی‌شوند. تاریخِ خالی یعنی «همان روز».
 */
export function toApiChequeFields(values, type = values.type ?? values.paymentType) {
  if (type !== PaymentTypeEnum.CHECK) return {};
  return {
    checkDueDate: values.checkDueDate || undefined,
    checkBankName: values.checkBankName?.trim() || undefined,
    checkDrawerName: values.checkDrawerName?.trim() || undefined,
  };
}

/** فیلدهای چکِ یک ردیفِ سرور برای پیش‌نویسِ فرم (اصلاح). */
export const chequeFieldsOf = (row) => ({
  checkDueDate: String(row?.checkDueDate ?? "").slice(0, 10),
  checkBankName: row?.checkBankName ?? "",
  checkDrawerName: row?.checkDrawerName ?? "",
});

/**
 * روش‌هایی که همان لحظه پول را از صندوق/حسابی جابه‌جا می‌کنند و `bankAccountId` می‌گیرند. نسیه پولی
 * جابه‌جا نمی‌کند و چک هنگامِ وصول حساب می‌گیرد (`api-guide` بخش‌های ۲۳ و ۲۴).
 */
export const takesBankAccount = (type) => type === PaymentTypeEnum.CASH || type === PaymentTypeEnum.TRANSFER;

/**
 * بدنه‌ی API برای یک ردیفِ پرداخت؛ مرجعِ چک/حواله و صندوق/حساب فقط برای همان روش‌ها.
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
    bankAccountId: takesBankAccount(values.type) ? values.bankAccountId || undefined : undefined,
    ...toApiChequeFields(values),
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

/** پرداختِ عادی (نه قسط و نه اثرِ مرجوعی) — فقط این‌ها از کارتِ پرداخت‌ها اصلاح/ابطال می‌شوند. */
export const isNormalPayment = (row) =>
  (row.purpose ?? PaymentPurposeEnum.NORMAL) === PaymentPurposeEnum.NORMAL;

/**
 * چکی که سرنوشتش ثبت شده (وصول، برگشت، خرج) دیگر با اصلاح/ابطال عوض نمی‌شود (سرور ۴۰۰)؛ از صفحه‌ی چک‌ها.
 */
export const isChequeSettled = (row) =>
  row.checkStatus != null && Number(row.checkStatus) !== ChequeStatusEnum.PENDING;
