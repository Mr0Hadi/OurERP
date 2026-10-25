import { useCallback, useEffect, useReducer, useRef } from "react";
import toast from "react-hot-toast";

import {
  canStartPos,
  holdsMoney,
  initialPosSession,
  isPosBusy,
  normalizeRrn,
  posSessionReducer,
  PosStatus,
} from "@/shared/domain/pos/posSession";
import { PosTransportError, getPosTransport } from "@/shared/services/pos/posTransport";
import { useUnsavedChangesGuard } from "@/shared/hooks/useUnsavedChangesGuard";
import { getErrorMessage } from "@/shared/lib/errorMessage";
import { nowLocalIso } from "@/shared/lib/dateUtils";

/** بعد از این مدت منتظرِ کارت، تراکنش لغو می‌شود. */
const CARD_TIMEOUT_MS = 120_000;
/** بعد از «لغو»، دستگاه این‌قدر وقت دارد نتیجه‌ی نهایی را بدهد؛ وگرنه «نامشخص». */
const CANCEL_GRACE_MS = 10_000;

/**
 * اجرای یک پرداخت با کارتخوان و ثبتِ خودکارش روی سند.
 *
 * ترتیب: دستور به دستگاه (`posTransport`) ← منتظرِ نتیجه ← اگر تأیید شد بلافاصله
 * `record` (بدونِ دکمه‌ی اصلیِ صفحه). وضعیت‌ها در `shared/domain/pos/posSession.js`.
 *
 * حالت‌های دشوار:
 *  - **رد / لغو / نرسیدنِ دستور:** چیزی از کارت کم نشده؛ دوباره می‌شود زد.
 *  - **قطعِ ارتباط بعد از ارسال، یا لغوِ بی‌پاسخ:** «نامشخص» — شاید کارت کشیده شده.
 *    کاربر آخرین تراکنشِ دستگاه را می‌پرسد (`checkLast`)، از رسید ثبت می‌کند
 *    (`confirmByReceipt`) یا تأیید می‌کند که پولی کم نشده (`reset`). پاسخِ دیرهنگامِ دستگاه
 *    هم همین وضعیت را روشن می‌کند.
 *  - **لغو هم‌زمان با کارت‌کشیدن:** «لغو» فقط درخواست است؛ نتیجه‌ی نهایی را خودِ `sale` می‌دهد.
 *  - **تأیید شد ولی ثبت نشد:** `retryRecord` همان نتیجه را دوباره می‌فرستد؛ `record` باید
 *    ایدمپوتنت باشد. اگر ثبت ممکن نیست، صفحه نتیجه را به ثبتِ دستی می‌سپارد و `reset` می‌کند.
 *  - از ارسالِ مبلغ تا ثبت، بستنِ برگه هشدار می‌دهد و ناوبریِ داخلِ برنامه بسته است؛
 *    وگرنه کارت کشیده می‌شود و کسی نیست که نتیجه را ثبت کند.
 *  - نتیجه‌ی «تأیید»ی که مبلغش با مبلغِ ارسالی نمی‌خواند (مثلاً آخرین تراکنشِ دستگاه مالِ
 *    خریدِ دیگری است) ثبت نمی‌شود و «نامشخص» می‌ماند.
 *
 * @param record     `(result, { terminal, amount, reference }) => Promise` — ثبتِ پرداخت روی سند
 * @param onRecorded با خروجیِ `record` بعد از ثبتِ موفق
 */
export function usePosPayment({ record, onRecorded }) {
  const [state, dispatch] = useReducer(posSessionReducer, initialPosSession);
  // اجرای جاری: { id, terminal, amount, reference, controller, timeout, grace, cancelling }
  const runRef = useRef(null);
  const callbacksRef = useRef({ record, onRecorded });
  useEffect(() => {
    callbacksRef.current = { record, onRecorded };
  });

  const clearTimers = useCallback(() => {
    clearTimeout(runRef.current?.timeout);
    clearTimeout(runRef.current?.grace);
  }, []);

  const runRecord = useCallback(async (result) => {
    const { terminal, amount, reference } = runRef.current;
    dispatch({ type: "recording" });
    try {
      const saved = await callbacksRef.current.record(result, { terminal, amount, reference });
      dispatch({ type: "recorded" });
      callbacksRef.current.onRecorded?.(saved);
    } catch (error) {
      dispatch({ type: "recordFailed", message: getErrorMessage(error, "ثبتِ پرداخت روی سند انجام نشد.") });
    }
  }, []);

  /** نتیجه‌ی نهاییِ دستگاه (از `sale`، `inquire` یا رسید). */
  const settle = useCallback(
    (result) => {
      clearTimers();
      const expected = runRef.current?.amount;
      if (result.outcome === "approved" && result.amount != null && Number(result.amount) !== expected) {
        dispatch({ type: "lost", message: "مبلغِ تراکنشِ دستگاه با مبلغِ ارسالی یکی نیست." });
        return;
      }
      dispatch({ type: "result", result });
      if (result.outcome === "approved") runRecord(result);
    },
    [clearTimers, runRecord],
  );

  const cancel = useCallback(async () => {
    const run = runRef.current;
    if (!run || run.cancelling) return;
    run.cancelling = true;
    clearTimeout(run.timeout);
    try {
      await getPosTransport().cancel({ terminal: run.terminal });
      run.grace = setTimeout(
        () => dispatch({ type: "lost", message: "پس از لغو، دستگاه نتیجه‌ای نداد." }),
        CANCEL_GRACE_MS,
      );
    } catch (error) {
      dispatch({ type: "lost", message: error.message || "لغوِ تراکنش روی دستگاه تأیید نشد." });
    }
  }, []);

  const start = useCallback(
    async ({ terminal, amount, reference }) => {
      // اجرای قبلی هنوز ممکن است پول داشته باشد؛ جایگزین‌کردنش نتیجه‌اش را گم می‌کند.
      if (!canStartPos(state.status)) return;
      const id = (runRef.current?.id ?? 0) + 1;
      const run = { id, terminal, amount, reference, controller: new AbortController(), cancelling: false };
      runRef.current = run;
      dispatch({ type: "start", amount });
      run.timeout = setTimeout(cancel, CARD_TIMEOUT_MS);

      try {
        const result = await getPosTransport().sale({
          terminal,
          amount,
          reference,
          signal: run.controller.signal,
          onSent: () => dispatch({ type: "sent" }),
        });
        if (runRef.current?.id === id) settle(result);
      } catch (error) {
        if (runRef.current?.id !== id) return;
        clearTimers();
        const unreachable = error instanceof PosTransportError && error.kind === "unreachable";
        dispatch({
          type: unreachable ? "unreachable" : "lost",
          message: error.message || "ارتباط با کارتخوان برقرار نشد.",
        });
      }
    },
    [state.status, cancel, clearTimers, settle],
  );

  /** از «نامشخص»: آخرین تراکنشِ دستگاه را بپرس. */
  const checkLast = useCallback(async () => {
    const { terminal, reference, amount } = runRef.current;
    try {
      const result = await getPosTransport().inquire({ terminal, reference, amount });
      settle(result ?? { outcome: "cancelled", message: "تراکنشی روی دستگاه انجام نشده بود." });
    } catch (error) {
      dispatch({ type: "lost", message: error.message || "دستگاه پاسخ نداد." });
    }
  }, [settle]);

  /**
   * از «نامشخص»: پرداخت از رویِ رسیدِ دستگاه ثبت می‌شود. شماره‌ی پیگیری باید شکلِ
   * درست داشته باشد (`normalizeRrn`)؛ پنل پیش از صدا زدن همین را چک می‌کند.
   */
  const confirmByReceipt = useCallback(
    ({ rrn }) => {
      const normalized = normalizeRrn(rrn);
      if (!normalized) return;
      settle({ outcome: "approved", rrn: normalized, transactionDate: nowLocalIso(), manual: true });
    },
    [settle],
  );

  const retryRecord = useCallback(() => {
    if (state.status === PosStatus.RECORD_FAILED) runRecord(state.result);
  }, [state.status, state.result, runRecord]);

  const reset = useCallback(() => {
    clearTimers();
    runRef.current?.controller.abort();
    runRef.current = null;
    dispatch({ type: "reset" });
  }, [clearTimers]);

  // از ارسالِ مبلغ تا ثبت: نه بستنِ برگه، نه رفتن به صفحه‌ی دیگرِ برنامه.
  const inFlight = isPosBusy(state.status) || holdsMoney(state.status);
  const blocker = useUnsavedChangesGuard(inFlight);
  useEffect(() => {
    if (blocker.state !== "blocked") return;
    toast.error("تا پایانِ کارِ کارتخوان و ثبتِ پرداخت نمی‌توانید از این صفحه بروید.");
    blocker.reset();
  }, [blocker]);

  useEffect(() => clearTimers, [clearTimers]);

  return { state, start, cancel, checkLast, confirmByReceipt, retryRecord, reset };
}
