import { PaymentTypeEnum } from "@/shared/domain/enums/paymentType";

/**
 * فرمِ «ثبت پرداخت»: کاربر اول *روش* را انتخاب می‌کند (نقدی، انتقال بانکی،
 * چک یا ترکیبی) و بعد مبلغ‌ها را (`PaymentMethodEditor`).
 *
 * شکل: `{ method, rows }`
 *   - `method`: یکی از `SETTLEMENT_METHODS`.
 *   - `rows`: پولی که همین حالا جابه‌جا می‌شود؛ هر ردیف
 *     `{ id, type, amount, paidAt, checkNumber, transferRef }`.
 *     روشِ تکی یک ردیف دارد و ترکیبی چند ردیف.
 *
 * مبلغِ `null` یعنی «باقیمانده»: در روشِ تکی کلِ مبلغ، در ترکیبی هر چه از
 * تکه‌های دیگر مانده. با تغییرِ اقلام خودش به‌روز می‌ماند و کاربر لازم نیست
 * بعد از هر تغییرِ قیمت دوباره عدد بنویسد. فقط یک ردیف (آخری) خودکار است.
 */

/** روش‌هایی که یک *ردیفِ* پرداخت می‌تواند داشته باشد. */
export const ROW_PAYMENT_TYPES = Object.freeze([
  PaymentTypeEnum.CASH,
  PaymentTypeEnum.TRANSFER,
  PaymentTypeEnum.CHECK,
]);

const rowId = () => `row-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

export function newPaymentRow(type = PaymentTypeEnum.CASH, amount = null) {
  return { id: rowId(), type, amount, paidAt: "", checkNumber: "", transferRef: "" };
}

/** روشِ مؤثر؛ `method: null` یعنی هنوز انتخاب نشده و پیش‌فرضِ همان سمت به کار می‌رود. */
export function methodOf(settlement, fallback = PaymentTypeEnum.CREDIT) {
  return settlement?.method ?? fallback;
}

/**
 * ردیف‌ها با مبلغِ نهایی: ردیفِ خودکار (`null`) باقیمانده‌ی `payable` را
 * می‌گیرد. بدونِ ردیفِ ذخیره‌شده (روشِ پیش‌فرض)، روشِ تکی یک ردیفِ «کلِ
 * مبلغ» دارد.
 */
export function resolvedRows(settlement, payable, fallback) {
  const method = methodOf(settlement, fallback);
  if (method === PaymentTypeEnum.CREDIT) return [];
  const rows = settlement?.rows?.length ? settlement.rows : [{ ...newPaymentRow(method), id: "default" }];
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

/**
 * عوض‌کردنِ روش. مبلغی که کاربر نوشته حفظ می‌شود: از روشِ تکی به تکی فقط
 * نوع عوض می‌شود؛ به ترکیبی، ردیفِ فعلی اولین تکه می‌شود (خالی، اگر «کلِ
 * مبلغ» بود) و تکه‌ی دوم باقیمانده را خودکار می‌گیرد.
 */
export function switchMethod(settlement, nextMethod, payable, fallback) {
  const current = methodOf(settlement, fallback);
  const first = settlement?.rows?.[0] ?? newPaymentRow(current === PaymentTypeEnum.CREDIT ? PaymentTypeEnum.CASH : current);

  if (nextMethod === PaymentTypeEnum.CREDIT) return { method: nextMethod, rows: [] };

  if (nextMethod === PaymentTypeEnum.MIXED) {
    if (current === PaymentTypeEnum.MIXED) return settlement;
    const secondType = ROW_PAYMENT_TYPES.find((type) => type !== first.type);
    return {
      method: nextMethod,
      rows: [{ ...first, amount: first.amount ?? 0 }, newPaymentRow(secondType)],
    };
  }

  // روشِ تکی: یک ردیف با همان مبلغ؛ از ترکیبی، «کلِ مبلغ».
  return {
    method: nextMethod,
    rows: [
      {
        ...first,
        type: nextMethod,
        amount: current === PaymentTypeEnum.MIXED ? null : first.amount,
      },
    ],
  };
}

/** افزودنِ تکه به ترکیبی: تکه‌ی تازه خودکار می‌شود و خودکارِ قبلی مبلغِ فعلی‌اش را نگه می‌دارد. */
export function addMixedRow(settlement, payable) {
  // خودکارِ فعلی مبلغِ همین لحظه‌اش را صریح نگه می‌دارد.
  const rows = resolvedRows(settlement, payable, PaymentTypeEnum.MIXED).map((row) => {
    const next = { ...row };
    delete next.auto;
    return next;
  });
  const used = new Set(rows.map((row) => row.type));
  const type = ROW_PAYMENT_TYPES.find((candidate) => !used.has(candidate)) ?? PaymentTypeEnum.CASH;
  return { method: PaymentTypeEnum.MIXED, rows: [...rows, newPaymentRow(type)] };
}

/**
 * حذفِ تکه از ترکیبی. اگر یک تکه ماند، سند به روشِ تکیِ همان تکه برمی‌گردد
 * (ترکیبیِ یک‌تکه بی‌معناست).
 */
export function removeMixedRow(settlement, id) {
  const rows = settlement.rows.filter((row) => row.id !== id);
  if (rows.length === 1) return { method: rows[0].type, rows: [{ ...rows[0], amount: null }] };
  const hasAuto = rows.some((row) => row.amount == null);
  return {
    method: PaymentTypeEnum.MIXED,
    rows: hasAuto ? rows : rows.map((row, index) => (index === rows.length - 1 ? { ...row, amount: null } : row)),
  };
}

export function updateRow(settlement, id, patch) {
  return { ...settlement, rows: settlement.rows.map((row) => (row.id === id ? { ...row, ...patch } : row)) };
}

/** ردیف‌هایی که واقعاً پول جابه‌جا می‌کنند (تکه‌ی صفر فرستاده نمی‌شود). */
export function liveRows(rows) {
  return rows.filter((row) => (Number(row.amount) || 0) > 0);
}
