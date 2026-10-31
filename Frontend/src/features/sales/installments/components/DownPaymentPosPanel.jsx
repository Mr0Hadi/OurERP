import { useEffect, useState } from "react";

import PosPaymentPanel from "@/shared/components/payments/pos/PosPaymentPanel";
import { PosStatus, canStartPos, holdsMoney, isPosBusy } from "@/shared/domain/pos/posSession";
import { usePosPayment } from "@/shared/hooks/usePosPayment";

/**
 * کارت‌کشیدنِ پیش‌پرداختِ قرارداد اقساط — همان پنلِ کارتخوانِ دریافت‌های عادی، زیرِ روشِ «انتقال بانکی».
 * مبلغ همان پیش‌پرداختِ پیش‌نویس است؛ با تأییدِ دستگاه، صفحه قرارداد را با همین پیش‌پرداخت (انتقال بانکی و
 * شماره‌ی پیگیریِ دستگاه) ثبت می‌کند و فاکتور صادر می‌شود. اگر ثبت شکست بخورد، شماره‌ی پیگیری در فرم
 * می‌نشیند تا با دکمه‌ی اصلی دستی ثبت شود (پولِ گرفته‌شده گم نمی‌شود).
 *
 * @param amount     پیش‌پرداخت (ریال)
 * @param posPayment `{ prepare?, record(result, { transferRef, terminal, amount, reference }), onDone, onLockChange,
 *                   reference, blockedReason?, hint?, doneLabel? }` — `record` قرارداد را ثبت می‌کند و باید
 *                   ایدمپوتنت باشد.
 * @param onManual   `({ transferRef, amount }) => void` — ثبتِ ناموفق: به فرم برای ثبتِ دستی
 */
export default function DownPaymentPosPanel({ amount, posPayment, onManual }) {
  const [preparing, setPreparing] = useState(false);
  const pos = usePosPayment({
    record: (result, context) =>
      posPayment.record(result, { ...context, transferRef: result.rrn || result.traceNumber }),
  });
  const { status } = pos.state;

  // وسطِ کارتخوان، با پولِ ثبت‌نشده یا رسیدِ باز: دکمه‌ی اصلیِ صفحه بسته است.
  const locked = isPosBusy(status) || holdsMoney(status) || status === PosStatus.RECORDED;
  const onLockChange = posPayment.onLockChange;
  useEffect(() => {
    onLockChange?.(locked);
    return () => onLockChange?.(false);
  }, [locked, onLockChange]);

  const start = async (terminal) => {
    if (preparing) return;
    setPreparing(true);
    try {
      // اعتبارسنجیِ قرارداد و ثبتِ شیوه‌ی پرداخت؛ خطا یعنی کارت نمی‌خورد.
      await posPayment.prepare?.();
    } catch {
      return;
    } finally {
      setPreparing(false);
    }
    const { reference } = posPayment;
    pos.start({ terminal, amount, reference: typeof reference === "function" ? reference() : reference });
  };

  const manual = () => {
    const { amount: charged, result } = pos.state;
    onManual({ amount: charged, transferRef: result.rrn || result.traceNumber });
    pos.reset();
  };

  return (
    <PosPaymentPanel
      pos={pos}
      amount={canStartPos(status) ? amount : pos.state.amount}
      blockedReason={!(Number(amount) > 0) ? "مبلغِ پیش‌پرداخت را وارد کنید." : posPayment.blockedReason}
      hint={posPayment.hint ?? "با تأییدِ کارتخوان قرارداد ثبت و فاکتور صادر می‌شود."}
      doneLabel={posPayment.doneLabel}
      preparing={preparing}
      onStart={start}
      onDone={() => {
        pos.reset();
        posPayment.onDone?.();
      }}
      onManual={manual}
    />
  );
}
