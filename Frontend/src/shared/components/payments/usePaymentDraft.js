import { useCallback, useMemo, useState } from "react";

import { PaymentTypeEnum } from "@/shared/domain/enums/paymentType";
import { PaymentPurposeEnum } from "@/shared/domain/enums/paymentDirection";
import { nowLocalIso } from "@/shared/lib/dateUtils";

const tempId = () => `new-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

/**
 * تغییرهای پرداختِ یک سند، پیش از ذخیره.
 *
 * ثبت، اصلاح و ابطالِ پرداخت دیگر همان لحظه به سرور نمی‌رود: هر کدام یک
 * «تغییرِ در انتظار» است و با دکمه‌ی اصلیِ «ثبت تغییرات» همراهِ بقیه‌ی
 * تغییرهای سند اعمال می‌شود (`runDocumentChanges`).
 *
 * `rows` همان ردیف‌های سرور است، با برچسبِ تغییرِ در انتظارِ هر کدام، به‌اضافه‌ی
 * ردیف‌های تازه. `netPaid` پرداخت‌شده‌ی خالص با احتسابِ همین تغییرهاست.
 *
 * @param saved      `paymentDetails`ِ سند
 * @param direction  جهتِ عادیِ پرداخت روی این سند (`PaymentDirectionEnum`)
 */
const EMPTY_PAYMENT_DRAFT = Object.freeze({ changes: {}, added: [] });

export function usePaymentDraft(saved = [], direction) {
  const [state, setState] = useState(EMPTY_PAYMENT_DRAFT);
  // { [paymentId]: { kind: "void" } | { kind: "edit", values } }
  const changes = useMemo(() => state?.changes ?? {}, [state]);
  // ردیف‌های تازه: { id, values }
  const added = useMemo(() => state?.added ?? [], [state]);

  const update = useCallback(
    (patch) =>
      setState((current) => {
        const base = current ?? EMPTY_PAYMENT_DRAFT;
        return { ...base, ...patch(base) };
      }),
    [setState],
  );

  const add = useCallback(
    (values) => update((current) => ({ added: [...current.added, { id: tempId(), values }] })),
    [update],
  );

  const edit = useCallback(
    (paymentId, values) =>
      update((current) =>
        String(paymentId).startsWith("new-")
          ? {
              added: current.added.map((row) => (row.id === paymentId ? { ...row, values } : row)),
            }
          : { changes: { ...current.changes, [paymentId]: { kind: "edit", values } } },
      ),
    [update],
  );

  const voidPayment = useCallback(
    (paymentId) =>
      update((current) =>
        String(paymentId).startsWith("new-")
          ? { added: current.added.filter((row) => row.id !== paymentId) }
          : { changes: { ...current.changes, [paymentId]: { kind: "void" } } },
      ),
    [update],
  );

  /** برگرداندنِ تغییرِ در انتظارِ یک ردیفِ سرور. */
  const undo = useCallback(
    (paymentId) =>
      update((current) => {
        const next = { ...current.changes };
        delete next[paymentId];
        return { changes: next };
      }),
    [update],
  );

  const reset = useCallback(() => update(() => EMPTY_PAYMENT_DRAFT), [update]);

  const rows = useMemo(() => {
    const fromServer = saved.map((payment) => {
      const change = changes[payment.id];
      return {
        ...payment,
        ...(change?.kind === "edit" ? change.values : {}),
        pending: change?.kind ?? null,
        original: change ? payment : null,
      };
    });
    const fresh = added.map((row) => ({
      id: row.id,
      ...row.values,
      purpose: PaymentPurposeEnum.NORMAL,
      pending: "add",
    }));
    return [...fromServer, ...fresh];
  }, [saved, changes, added]);

  const netPaid = useMemo(
    () =>
      rows.reduce((sum, row) => {
        if (row.voidedAt || row.pending === "void") return sum;
        const amount = Number(row.amount) || 0;
        return sum + (row.direction === direction ? amount : -amount);
      }, 0),
    [rows, direction],
  );

  const count = Object.keys(changes).length + added.length;

  /**
   * عملیات به ترتیبِ امن: ابطال، اصلاح، ثبتِ تازه. هر عملیاتِ موفق از پیش‌نویس
   * برداشته می‌شود؛ اگر یکی شکست بخورد، باقی (و خودش) در انتظار می‌مانند.
   */
  const operations = useMemo(() => {
    const voids = Object.entries(changes)
      .filter(([, change]) => change.kind === "void")
      .map(([paymentId]) => ({ kind: "void", paymentId: Number(paymentId) }));
    const edits = Object.entries(changes)
      .filter(([, change]) => change.kind === "edit")
      .map(([paymentId, change]) => ({
        kind: "edit",
        paymentId: Number(paymentId),
        values: change.values,
      }));
    const adds = added.map((row) => ({ kind: "add", id: row.id, values: row.values }));
    return [...voids, ...edits, ...adds];
  }, [changes, added]);

  const settle = useCallback(
    (operation) => (operation.kind === "add" ? voidPayment(operation.id) : undo(operation.paymentId)),
    [voidPayment, undo],
  );

  return {
    rows,
    netPaid,
    count,
    hasChanges: count > 0,
    operations,
    add,
    edit,
    void: voidPayment,
    undo,
    reset,
    settle,
  };
}

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
