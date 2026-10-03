import { PaymentTypeEnum } from "@/shared/domain/enums/paymentType";

/**
 * پرداختی که در فرمِ «ثبت پرداخت» ساخته می‌شود (`PaymentMethodEditor`): روش
 * (نقدی، انتقال بانکی، چک یا ترکیبی) و مبلغ‌ها.
 *
 * شکل: `{ method, rows }` — `rows` هر کدام
 * `{ id, type, amount, paidAt, checkNumber, transferRef }`؛ روشِ تکی یک ردیف دارد
 * و ترکیبی چند ردیف. `method` خالی یعنی هنوز انتخاب نشده (نقدی).
 *
 * مبلغِ `null` یعنی «باقیمانده»: در روشِ تکی کلِ مانده، در ترکیبی هر چه از
 * تکه‌های دیگر مانده. فقط یک ردیف (آخری) خودکار است.
 */

/** روش‌هایی که یک *ردیفِ* پرداخت می‌تواند داشته باشد («ترکیبی» یعنی چند ردیف). */
export const ROW_PAYMENT_TYPES = Object.freeze([
  PaymentTypeEnum.CASH,
  PaymentTypeEnum.TRANSFER,
  PaymentTypeEnum.CHECK,
]);

const DEFAULT_METHOD = PaymentTypeEnum.CASH;

const rowId = () => `row-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

export function newPaymentRow(type = DEFAULT_METHOD, amount = null) {
  return { id: rowId(), type, amount, paidAt: "", checkNumber: "", transferRef: "" };
}

export function methodOf(split) {
  return split?.method ?? DEFAULT_METHOD;
}

/**
 * ردیف‌ها با مبلغِ نهایی (`auto` یعنی «باقیمانده»ی `payable`). بی ردیفِ
 * ذخیره‌شده، روشِ تکی یک ردیفِ «کلِ مانده» دارد.
 */
export function resolvedRows(split, payable) {
  const method = methodOf(split);
  const rows = split?.rows?.length ? split.rows : [{ ...newPaymentRow(method), id: "default" }];
  const explicit = rows.reduce((sum, row) => sum + (row.amount == null ? 0 : Number(row.amount) || 0), 0);
  const auto = Math.max(0, (Number(payable) || 0) - explicit);
  return rows.map((row) => ({
    ...row,
    auto: row.amount == null,
    amount: row.amount == null ? auto : Number(row.amount) || 0,
  }));
}

export function rowsTotal(rows) {
  return rows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
}

/** ردیف‌هایی که واقعاً پول جابه‌جا می‌کنند (تکه‌ی صفر فرستاده نمی‌شود). */
export function liveRows(rows) {
  return rows.filter((row) => (Number(row.amount) || 0) > 0);
}

/**
 * عوض‌کردنِ روش. مبلغی که کاربر نوشته حفظ می‌شود: از تکی به تکی فقط نوع عوض
 * می‌شود؛ به ترکیبی، ردیفِ فعلی اولین تکه می‌شود (خالی، اگر «کلِ مانده» بود) و
 * تکه‌ی دوم باقیمانده را خودکار می‌گیرد.
 */
export function switchMethod(split, nextMethod) {
  const current = methodOf(split);
  const first = split?.rows?.[0] ?? newPaymentRow(current);

  if (nextMethod === PaymentTypeEnum.MIXED) {
    if (current === PaymentTypeEnum.MIXED) return split;
    const secondType = ROW_PAYMENT_TYPES.find((type) => type !== first.type);
    return {
      method: nextMethod,
      rows: [{ ...first, amount: first.amount ?? 0 }, newPaymentRow(secondType)],
    };
  }

  // روشِ تکی: یک ردیف با همان مبلغ؛ از ترکیبی، «کلِ مانده».
  return {
    method: nextMethod,
    rows: [{ ...first, type: nextMethod, amount: current === PaymentTypeEnum.MIXED ? null : first.amount }],
  };
}

/** افزودنِ تکه به ترکیبی: تکه‌ی تازه خودکار می‌شود و خودکارِ قبلی مبلغِ فعلی‌اش را صریح نگه می‌دارد. */
export function addMixedRow(split, payable) {
  const rows = resolvedRows(split, payable).map((row) => {
    const explicit = { ...row };
    delete explicit.auto;
    return explicit;
  });
  const used = new Set(rows.map((row) => row.type));
  const type = ROW_PAYMENT_TYPES.find((candidate) => !used.has(candidate)) ?? DEFAULT_METHOD;
  return { method: PaymentTypeEnum.MIXED, rows: [...rows, newPaymentRow(type)] };
}

/** حذفِ تکه از ترکیبی؛ اگر یک تکه ماند، روشِ تکیِ همان تکه می‌شود. */
export function removeMixedRow(split, id) {
  const rows = split.rows.filter((row) => row.id !== id);
  if (rows.length === 1) return { method: rows[0].type, rows: [{ ...rows[0], amount: null }] };
  const hasAuto = rows.some((row) => row.amount == null);
  return {
    method: PaymentTypeEnum.MIXED,
    rows: hasAuto ? rows : rows.map((row, index) => (index === rows.length - 1 ? { ...row, amount: null } : row)),
  };
}

export function updateRow(split, id, patch) {
  return { ...split, rows: split.rows.map((row) => (row.id === id ? { ...row, ...patch } : row)) };
}
