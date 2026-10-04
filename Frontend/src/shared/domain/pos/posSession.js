import { normalizePersianDigits } from "@/shared/lib/persianDigits";

/**
 * یک «پرداخت با کارتخوان» از لحظه‌ی ارسال مبلغ تا ثبتِ پرداخت روی سند — ماشینِ
 * وضعیتِ خالص (بی React و بی شبکه)، تا هوکِ `usePosPayment` فقط رویدادها را
 * بفرستد و کامپوننت فقط وضعیت را بخواند.
 *
 * مهم‌ترین قاعده: **کارت‌کشیدن برگشت‌ناپذیر است.** از لحظه‌ای که دستگاه تأیید
 * داده، تا وقتی پرداخت روی سند ثبت نشده، «پول در راه است» و کاربر نباید بتواند
 * صفحه را ببندد یا دوباره مبلغ بزند (`holdsMoney`).
 *
 *   idle ─start─▶ starting ─sent─▶ waitingCard ─result─▶ approved ─▶ recording ─▶ recorded
 *                    │                │                  ├─▶ declined
 *                    │                │                  └─▶ cancelled
 *                    └─unreachable─▶ failed     (چیزی به دستگاه نرسید؛ تلاشِ دوباره امن است)
 *                                     └─lost──▶ unknown ─result─▶ …   (شاید کارت کشیده شده)
 *   recording ─خطا─▶ recordFailed ─retry─▶ recording
 */

export const PosStatus = Object.freeze({
  IDLE: "idle",
  STARTING: "starting",
  WAITING_CARD: "waitingCard",
  APPROVED: "approved",
  RECORDING: "recording",
  RECORDED: "recorded",
  DECLINED: "declined",
  CANCELLED: "cancelled",
  FAILED: "failed",
  UNKNOWN: "unknown",
  RECORD_FAILED: "recordFailed",
});

/**
 * خروجیِ یک تراکنشِ پایان‌یافته روی دستگاه — همان نام‌های `PosChargeResultDto`ِ
 * بکند. `outcome` را لایه‌ی ارتباط با دستگاه می‌گذارد.
 *
 * @typedef {object} PosResult
 * @property {"approved"|"declined"|"cancelled"} outcome
 * @property {string} [rrn]               شماره‌ی مرجع (پیگیری)
 * @property {string} [traceNumber]
 * @property {string} [approvalCode]
 * @property {string} [maskedCardNumber]  مثلاً `603770******1234`
 * @property {string} [transactionDate]
 * @property {number} [amount]            مبلغی که دستگاه واقعاً کشید (اگر دستگاه بدهد)
 * @property {string} [message]           پیامِ بانک برای ردشده
 * @property {boolean} [manual]           از رسیدِ کاغذی وارد شده، نه از دستگاه
 */

export const initialPosSession = Object.freeze({
  status: PosStatus.IDLE,
  amount: 0,
  result: null,
  message: "",
});

/**
 * شماره‌ی پیگیری (RRN) که کاربر از روی رسید تایپ می‌کند: رقم‌های فارسی به لاتین،
 * بی فاصله و خط‌تیره، ۶ تا ۲۰ رقم. نامعتبر → `null`. شماره‌ی دستیِ اشتباه یعنی
 * پرداختی که با صورت‌حسابِ بانک تطبیق نمی‌خورد.
 */
export function normalizeRrn(value) {
  const digits = normalizePersianDigits(String(value ?? "")).replace(/[\s-]/g, "");
  return /^\d{6,20}$/.test(digits) ? digits : null;
}

/**
 * شناسه‌ی سفارش برای دستگاه — برای *هر* بار ارسال تازه. با شناسه‌ی ثابت (مثلاً فقط
 * شماره‌ی فروش) «بررسیِ آخرین تراکنش» در دومین دریافتِ همان فاکتور تراکنشِ قبلی را
 * پیدا می‌کرد و آن را پرداختِ تازه می‌پنداشت.
 */
export function newPosReference(prefix) {
  const random = Math.random().toString(36).slice(2, 6);
  return `${prefix}-${Date.now().toString(36)}${random}`;
}

/** تا پایانِ کار منتظرِ دستگاه یا سرور هستیم؛ دکمه‌ها باید قفل باشند. */
export const isPosBusy = (status) =>
  status === PosStatus.STARTING ||
  status === PosStatus.WAITING_CARD ||
  status === PosStatus.RECORDING;

/** پول ممکن است از مشتری کم شده باشد ولی روی سند ثبت نشده — خروج/تلاشِ دوباره ممنوع. */
export const holdsMoney = (status) =>
  status === PosStatus.APPROVED ||
  status === PosStatus.RECORDING ||
  status === PosStatus.RECORD_FAILED ||
  status === PosStatus.UNKNOWN;

/** می‌شود از نو شروع کرد (هیچ پولی در راه نیست). */
export const canStartPos = (status) =>
  status === PosStatus.IDLE ||
  status === PosStatus.DECLINED ||
  status === PosStatus.CANCELLED ||
  status === PosStatus.FAILED;

/** هنوز نتیجه‌ی نهاییِ دستگاه نرسیده. */
const awaitsDevice = (status) =>
  status === PosStatus.STARTING || status === PosStatus.WAITING_CARD || status === PosStatus.UNKNOWN;

export function posSessionReducer(state, event) {
  switch (event.type) {
    case "start":
      if (!canStartPos(state.status)) return state;
      return { ...initialPosSession, status: PosStatus.STARTING, amount: event.amount };

    // دستورِ مبلغ به دستگاه رسید و منتظرِ کارت است.
    case "sent":
      return state.status === PosStatus.STARTING ? { ...state, status: PosStatus.WAITING_CARD } : state;

    // نتیجه‌ی دستگاه؛ در «نامشخص» هم پذیرفته می‌شود (پاسخِ دیرهنگام، بررسیِ آخرین تراکنش، رسید).
    case "result": {
      if (!awaitsDevice(state.status)) return state;
      const { result } = event;
      if (result.outcome === "approved") return { ...state, status: PosStatus.APPROVED, result, message: "" };
      if (result.outcome === "declined") {
        return { ...state, status: PosStatus.DECLINED, result, message: result.message || "تراکنش توسط بانک رد شد." };
      }
      return { ...state, status: PosStatus.CANCELLED, result, message: result.message || "تراکنش لغو شد." };
    }

    // پیش از رسیدنِ دستور به دستگاه شکست خورد.
    case "unreachable":
      return state.status === PosStatus.STARTING || state.status === PosStatus.WAITING_CARD
        ? { ...state, status: PosStatus.FAILED, message: event.message }
        : state;

    // دستور فرستاده شد ولی پاسخ نیامد (قطعِ ارتباط، لغوِ بی‌پاسخ).
    case "lost":
      return awaitsDevice(state.status) ? { ...state, status: PosStatus.UNKNOWN, message: event.message } : state;

    case "recording":
      if (state.status !== PosStatus.APPROVED && state.status !== PosStatus.RECORD_FAILED) return state;
      return { ...state, status: PosStatus.RECORDING, message: "" };

    case "recorded":
      return state.status === PosStatus.RECORDING ? { ...state, status: PosStatus.RECORDED } : state;

    case "recordFailed":
      return state.status === PosStatus.RECORDING
        ? { ...state, status: PosStatus.RECORD_FAILED, message: event.message }
        : state;

    // بستنِ نتیجه‌ی پایانی، یا تأییدِ کاربر در «نامشخص» که پولی کم نشده.
    case "reset":
      return initialPosSession;

    default:
      return state;
  }
}
