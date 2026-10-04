import { useEffect, useState } from "react";

import { usePosPayment } from "@/shared/hooks/usePosPayment";
import { PosStatus, canStartPos, holdsMoney, isPosBusy } from "@/shared/domain/pos/posSession";
import { PaymentTypeEnum } from "@/shared/domain/enums/paymentType";
import { materializeRows, methodOf, removeMixedRow, updateRow } from "@/shared/domain/payments/paymentSplit";

/** ردیفِ فرم → بدنه‌ی پرداخت (همان شکلی که `PaymentForm` به `onSubmit` می‌دهد). */
export const toMoneyRow = (entry) => ({
  type: entry.type,
  amount: entry.amount,
  paidAt: entry.paidAt || undefined,
  checkNumber: entry.checkNumber,
  transferRef: entry.transferRef,
});

/**
 * «دریافت با کارتخوان» داخلِ فرمِ پرداختِ `PaymentsCard`: کدام تکه به دستگاه می‌رود،
 * قفلِ فرم تا پایانِ کار، و کارهای پنل (ارسال، بستنِ رسید، ثبتِ دستی).
 *
 * کارتخوان فقط برای دریافتِ تازه و روی ردیفِ «انتقال بانکی» است (در ترکیبی، اولین ردیفِ
 * انتقال). برخلافِ بقیه‌ی دریافت‌ها همان لحظه با `posPayment.record` روی سرور ثبت می‌شود.
 *
 * @param value      `{ method, rows }`ِ فرم و `setValue`
 * @param pieces     ردیف‌های زنده با مبلغِ نهایی (`liveRows(resolvedRows(...))`)
 * @param payable    سقفِ مبلغ (مانده)
 * @param posPayment پیکربندیِ صفحه (`PaymentsCard` را ببینید)؛ `undefined` یعنی بی‌کارتخوان
 * @param onClose    بستنِ فرم بعد از رسیدِ موفق
 * @returns `{ shown, locked, panelProps }` — `locked` یعنی فیلدها و دکمه‌های فرم بسته باشند
 */
export function useFormPosPayment({ mode, value, setValue, pieces, payable, posPayment, onClose }) {
  const posRow = pieces.find((entry) => entry.type === PaymentTypeEnum.TRANSFER);
  const [posRowId, setPosRowId] = useState(null); // ردیفی که به دستگاه رفت
  const [preparing, setPreparing] = useState(false);

  const pos = usePosPayment({
    record: (result, context) => {
      const transferRef = result.rrn || result.traceNumber;
      const withRef = pieces.map((entry) => (entry.id === posRowId ? { ...entry, transferRef } : entry));
      const row = withRef.find((entry) => entry.id === posRowId);
      return posPayment.record(result, { ...context, row: toMoneyRow(row), rows: withRef.map(toMoneyRow) });
    },
    onRecorded: (saved) => posPayment.onRecorded?.(saved),
  });

  const { status } = pos.state;
  const shown = Boolean(posPayment) && mode === "pay" && (Boolean(posRow) || status !== PosStatus.IDLE);
  // پیش از ارسال: مبلغِ تکه‌ی انتقال؛ بعد از آن: همان مبلغی که به دستگاه رفت.
  const amount = canStartPos(status) ? (posRow?.amount ?? 0) : pos.state.amount;
  const blockedReason = amount > payable ? "مبلغ از مانده‌ی فاکتور بیشتر است." : posPayment?.blockedReason;
  // وسطِ کارتخوان، با پولِ ثبت‌نشده یا رسیدِ باز: فرم و دکمه‌ی اصلیِ صفحه بسته‌اند.
  const locked = isPosBusy(status) || holdsMoney(status) || status === PosStatus.RECORDED;

  const onLockChange = posPayment?.onLockChange;
  useEffect(() => {
    onLockChange?.(locked);
    return () => onLockChange?.(false);
  }, [locked, onLockChange]);

  const start = async (terminal) => {
    if (preparing) return;
    setPreparing(true);
    try {
      // مثلاً ذخیره‌ی پیش‌فاکتور؛ خطا یعنی کارت نمی‌خورد (پیامش را خودِ prepare داده).
      await posPayment.prepare?.();
    } catch {
      return;
    } finally {
      setPreparing(false);
    }
    setPosRowId(posRow.id);
    const { reference } = posPayment;
    pos.start({ terminal, amount, reference: typeof reference === "function" ? reference() : reference });
  };

  const done = () => {
    pos.reset();
    if (posPayment.onDone) return posPayment.onDone();
    // ترکیبی: تکه‌ی کارتخوان ثبت شد و از فرم برداشته می‌شود؛ بقیه می‌مانند.
    if (methodOf(value) === PaymentTypeEnum.MIXED) return setValue(removeMixedRow(value, posRowId));
    onClose();
  };

  // پول رفته ولی ثبت نشد: مبلغ و شماره‌ی پیگیری در همان ردیف می‌نشیند تا با «افزودن» ثبت شود.
  const manual = () => {
    const { amount: charged, result } = pos.state;
    const editable = materializeRows(value, payable);
    setValue(updateRow(editable, posRowId, { amount: charged, transferRef: result.rrn || result.traceNumber }));
    pos.reset();
  };

  return {
    shown,
    locked,
    panelProps: {
      pos,
      amount,
      blockedReason,
      hint: posPayment?.hint,
      doneLabel: posPayment?.doneLabel,
      preparing,
      onStart: start,
      onDone: done,
      onManual: manual,
    },
  };
}
