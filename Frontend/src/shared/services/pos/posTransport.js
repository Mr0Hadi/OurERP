/**
 * قراردادِ ارتباط با دستگاهِ کارتخوان — **هنوز پیاده‌سازی نشده** (بعد از معلوم‌شدنِ
 * PSPِ هر دستگاه نوشته می‌شود). همه‌ی فرانت فقط از همین چهار تابع استفاده می‌کند
 * و نمی‌داند دستگاه چه پروتکلی دارد؛ هر PSP یک پیاده‌سازی بر پایه‌ی
 * `terminal.vendor` خواهد بود.
 *
 * @typedef {object} PosTerminal  ردیفِ `PosTerminal/GetPosTerminalList` (`id, name, vendor, host, port`)
 *
 * @typedef {object} PosTransport
 * @property {(args: { terminal: PosTerminal, amount: number, reference: string,
 *                     signal: AbortSignal, onSent: () => void }) => Promise<import("@/shared/domain/pos/posSession").PosResult>} sale
 *   مبلغ را روی دستگاه می‌آورد و تا پایانِ تراکنش منتظر می‌ماند. `onSent` را همین‌که دستگاه
 *   دستور را گرفت صدا بزند. اگر *پیش از* رسیدنِ دستور شکست خورد `PosTransportError("unreachable")`،
 *   اگر *بعد از آن* ارتباط قطع شد `PosTransportError("lost")` بیندازد. `signal` وقتی abort می‌شود
 *   که کاربر جلسه را بسته است (فقط منتظرماندن را رها کند؛ دستگاه را لغو نکند).
 * @property {(args: { terminal: PosTerminal }) => Promise<void>} cancel
 *   تراکنشِ در انتظارِ کارت را روی دستگاه لغو می‌کند؛ اگر نتوانست `PosTransportError("lost")`.
 * @property {(args: { terminal: PosTerminal, reference: string, amount: number }) => Promise<import("@/shared/domain/pos/posSession").PosResult | null>} inquire
 *   آخرین تراکنشِ دستگاه برای این `reference` و مبلغ؛ `null` یعنی تراکنشی انجام نشده.
 */

/** `kind`: `"unreachable"` (چیزی نرسید، امن) | `"lost"` (نتیجه نامشخص) */
export class PosTransportError extends Error {
  constructor(kind, message) {
    super(message);
    this.name = "PosTransportError";
    this.kind = kind;
  }
}

const notReady = () => {
  throw new PosTransportError("unreachable", "ارتباط با کارتخوان هنوز راه‌اندازی نشده است.");
};

/** @returns {PosTransport} */
export function getPosTransport() {
  return { sale: notReady, cancel: notReady, inquire: notReady };
}
