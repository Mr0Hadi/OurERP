import { useCallback, useMemo, useState } from "react";

import { PaymentPurposeEnum } from "@/shared/domain/enums/paymentDirection";
import { EMPTY_PAYMENT_DRAFT } from "@/shared/domain/payments/paymentRows";

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
 * @param external   `[state, setState]` اختیاری — پیش‌نویس در storeِ فرم، تا رفتن به
 *                   «کالای جدید» و برگشتن پاکش نکند. `setState` مثلِ `useState`
 *                   تابعِ به‌روزرسان می‌پذیرد.
 */

export function usePaymentDraft(saved = [], direction, external) {
  const internal = useState(EMPTY_PAYMENT_DRAFT);
  const [state, setState] = external ?? internal;
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
