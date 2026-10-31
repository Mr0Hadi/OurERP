import { describe, expect, it, vi } from "vitest";
import { PosTransportError, getPosTransport } from "@/shared/services/pos/posTransport";
import { PosStatus as S, canStartPos, holdsMoney, initialPosSession, isPosBusy, newPosReference, normalizeRrn, posSessionReducer } from "./posSession";

const run = (...events) => events.reduce(posSessionReducer, initialPosSession);
const approved = { outcome: "approved", rrn: "123456" };

describe("چرخه‌ی کارتخوان", () => {
  it("مسیرِ موفق: شروع → ارسال → تأیید → ثبت", () => {
    const states = [{ type: "start", amount: 500 }, { type: "sent" }, { type: "result", result: approved }, { type: "recording" }, { type: "recorded" }]
      .reduce((acc, event) => [...acc, posSessionReducer(acc.at(-1), event)], [initialPosSession])
      .map((state) => state.status);
    expect(states).toEqual([S.IDLE, S.STARTING, S.WAITING_CARD, S.APPROVED, S.RECORDING, S.RECORDED]);
    expect(run({ type: "start", amount: 500 }).amount).toBe(500);
  });

  it("رد/لغو با پیامِ پیش‌فرض یا پیامِ دستگاه", () => {
    expect(run({ type: "start" }, { type: "result", result: { outcome: "declined" } })).toMatchObject({ status: S.DECLINED, message: "تراکنش توسط بانک رد شد." });
    expect(run({ type: "start" }, { type: "result", result: { outcome: "x", message: "کاربر لغو کرد" } })).toMatchObject({ status: S.CANCELLED, message: "کاربر لغو کرد" });
  });

  it("بی‌پاسخ = نامشخص؛ پاسخِ دیرهنگام هنوز پذیرفته می‌شود", () => {
    const unknown = run({ type: "start" }, { type: "sent" }, { type: "lost", message: "قطع شد" });
    expect(unknown).toMatchObject({ status: S.UNKNOWN, message: "قطع شد" });
    expect(posSessionReducer(unknown, { type: "result", result: approved }).status).toBe(S.APPROVED);
    // پیش از رسیدن به دستگاه: امن، از نو.
    expect(run({ type: "start" }, { type: "unreachable", message: "x" }).status).toBe(S.FAILED);
    expect(posSessionReducer(unknown, { type: "unreachable" })).toBe(unknown);
  });

  it("پولِ در راه: شروعِ دوباره و رویدادِ نابه‌جا بی‌اثر", () => {
    const paid = run({ type: "start", amount: 9 }, { type: "result", result: approved });
    expect(posSessionReducer(paid, { type: "start", amount: 1 })).toBe(paid);
    expect(posSessionReducer(paid, { type: "result", result: { outcome: "declined" } })).toBe(paid);
    expect(posSessionReducer(paid, { type: "recorded" })).toBe(paid);
    const failed = run({ type: "start" }, { type: "result", result: approved }, { type: "recording" }, { type: "recordFailed", message: "۵۰۰" });
    expect(failed).toMatchObject({ status: S.RECORD_FAILED, message: "۵۰۰" });
    expect(posSessionReducer(failed, { type: "recording" }).status).toBe(S.RECORDING);
    expect(posSessionReducer(failed, { type: "reset" })).toBe(initialPosSession);
    expect(posSessionReducer(failed, { type: "?" })).toBe(failed);
    expect(run({ type: "sent" })).toBe(initialPosSession);
  });

  it("سه دسته‌ی وضعیت هم‌پوشانی ندارند و پولِ در راه هرگز «شروع‌پذیر» نیست", () => {
    for (const status of Object.values(S)) {
      expect(canStartPos(status) && holdsMoney(status), status).toBe(false);
      expect(canStartPos(status) && isPosBusy(status), status).toBe(false);
    }
    expect(Object.values(S).filter(holdsMoney)).toEqual([S.APPROVED, S.RECORDING, S.UNKNOWN, S.RECORD_FAILED]);
  });
});

describe("کمک‌ها", () => {
  it("RRN: رقمِ فارسی، فاصله و خط‌تیره؛ طولِ ۶ تا ۲۰", () => {
    expect([normalizeRrn("۱۲۳ ۴۵۶"), normalizeRrn("12-34-56-78"), normalizeRrn("12345"), normalizeRrn("1".repeat(21)), normalizeRrn("12a456"), normalizeRrn(null)]).toEqual([
      "123456", "12345678", null, null, null, null,
    ]);
  });

  it("مرجعِ تازه یکتا با پیشوند", () => {
    vi.spyOn(Math, "random").mockReturnValueOnce(0.1).mockReturnValueOnce(0.2);
    const [a, b] = [newPosReference("SALE"), newPosReference("SALE")];
    expect(a).toMatch(/^SALE-[0-9a-z]+$/);
    expect(a).not.toBe(b);
    vi.restoreAllMocks();
  });

  it("تا راه‌اندازیِ دستگاه: خطای «نرسید» (امن)", () => {
    const transport = getPosTransport();
    for (const call of [transport.sale, transport.cancel, transport.inquire]) {
      expect(call).toThrow(PosTransportError);
      try {
        call();
      } catch (error) {
        expect(error.kind).toBe("unreachable");
      }
    }
  });
});
