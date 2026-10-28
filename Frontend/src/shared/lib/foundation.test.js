import { describe, expect, it, vi } from "vitest";
import { TONES, toneRow, toneSoft, toneSolid, toneText } from "./tone";
import { createRowStatus } from "./createRowStatus";
import { initialsOf } from "./initialsOf";
import { cn } from "./utils";
import { draftId } from "./draftId";
import { notifyNavigationSettled, notifyNavigationStart, onNavigationSettled, onNavigationStart } from "./routeTransitionBus";
import {
  formatCardNumber,
  formatShaba,
  getIranianBank,
  getIranianBankByName,
  normalizeCardNumber,
  normalizeShaba,
  iranianBanks,
} from "./iranian-bank";

describe("tone", () => {
  it("هر معنا در هر چهار نقشه؛ ناشناخته = neutral", () => {
    expect(TONES).toEqual(["neutral", "primary", "info", "success", "warning", "caution", "special", "danger"]);
    for (const tone of TONES) {
      expect(toneSoft(tone)).toBeTruthy();
      expect(toneSolid(tone)).toBeTruthy();
      expect(toneText(tone)).toBeTruthy();
      expect(typeof toneRow(tone)).toBe("string");
    }
    expect(toneSoft("نامعلوم")).toBe(toneSoft("neutral"));
    expect(toneText(undefined)).toBe(toneText("neutral"));
  });
});

describe("createRowStatus", () => {
  const { getRowStatus, ROW_STATUS_CONFIG } = createRowStatus({
    completeLabel: "کامل", partialLabel: "ناقص", emptyKey: "missing", emptyLabel: "نرسیده",
  });
  it("سه حالت با آستانه‌ها", () => {
    expect(getRowStatus(5, 0)).toBe("missing");
    expect(getRowStatus(5, undefined)).toBe("missing");
    expect(getRowStatus(5, 3)).toBe("partial");
    expect(getRowStatus(5, 5)).toBe("complete");
    expect(getRowStatus(5, 7)).toBe("complete");
    expect(ROW_STATUS_CONFIG.missing).toMatchObject({ label: "نرسیده", tone: "danger" });
  });
});

describe("کمکی‌های کوچک", () => {
  it("initialsOf", () => {
    expect(initialsOf("  علی   رضایی  محمدی ")).toBe("عر");
    expect(initialsOf(null)).toBe("");
  });
  it("cn: کلاسِ متعارضِ Tailwind، آخری برنده", () => {
    expect(cn("p-2 text-sm", false, null, undefined, "p-4")).toBe("text-sm p-4");
  });
  it("draftId یکتا", () => {
    expect(new Set(Array.from({ length: 200 }, draftId)).size).toBe(200);
  });
});

describe("routeTransitionBus", () => {
  it("فقط پایانِ تازه‌ترین ناوبری گزارش می‌شود", () => {
    const started = vi.fn();
    const settled = vi.fn();
    const offStart = onNavigationStart(started);
    const offSettled = onNavigationSettled(settled);
    const first = notifyNavigationStart();
    const second = notifyNavigationStart();
    notifyNavigationSettled(first, "/a");
    notifyNavigationSettled(second, "/b");
    expect(started).toHaveBeenCalledTimes(2);
    expect(settled).toHaveBeenCalledExactlyOnceWith("/b");
    offStart();
    offSettled();
    notifyNavigationSettled(notifyNavigationStart(), "/c");
    expect(settled).toHaveBeenCalledTimes(1);
  });
});

describe("بانک‌ها", () => {
  it("قالب و نرمال‌سازیِ کارت و شبا (با رقمِ فارسی)", () => {
    expect(normalizeCardNumber("۶۰۳۷-۹۹۱۲ 3456 7890 99")).toBe("6037991234567890");
    expect(formatCardNumber("6037991234567890")).toBe("6037 9912 3456 7890");
    expect(normalizeShaba("ir 12 0170 0000")).toBe("1201700000");
    expect(formatShaba("IR120170000000000000000000", "-")).toBe("1201-7000-0000-0000-0000-0000");
  });

  it("بانک از کارت، بعد شبا، بعد نام", () => {
    expect(getIranianBank({ cardNumber: "6037991234567890" })?.id).toBe("melli");
    expect(getIranianBank({ iban: "IR120170000000000000000000" })?.id).toBe("melli");
    expect(getIranianBank({ bankName: "بانک ملت - جاری" })?.id).toBe("mellat");
    expect(getIranianBank({})).toBeUndefined();
  });

  it("نامِ بلندتر برنده است: «توسعه صادرات» نه «صادرات»؛ ي/ك عربی هم", () => {
    expect(getIranianBankByName("بانک توسعه صادرات ایران")?.id).toBe("tosee_saderat");
    expect(getIranianBankByName("بانك صادرات")?.id).toBe("saderat");
  });

  it("سامان و بلو: کارتِ بلو با پیشوندِ بلندترش، ولی شبای ۰۵۶ مالِ سامان است", () => {
    expect(getIranianBank({ cardNumber: "6219861812345678" })?.id).toBe("blubank");
    expect(getIranianBank({ cardNumber: "6219860012345678" })?.id).toBe("saman");
    // بلو شعبه‌ی دیجیتالِ سامان است و شبایش همان کدِ ۰۵۶؛ از شبا نمی‌شود بلو را جدا کرد.
    expect(getIranianBank({ iban: "IR120560000000000000000000" })?.id).toBe("saman");
  });

  it("پیشوندِ کارت و کدِ شبای بانک‌ها یکتا و هم‌شکل‌اند", () => {
    const prefixes = iranianBanks.flatMap((bank) => bank.cardPrefixes);
    const codes = iranianBanks.flatMap((bank) => bank.ibanCodes);
    expect(new Set(iranianBanks.map((bank) => bank.id)).size).toBe(iranianBanks.length);
    expect(new Set(prefixes).size).toBe(prefixes.length);
    expect(new Set(codes).size).toBe(codes.length);
    expect(prefixes.every((prefix) => /^\d{6,8}$/.test(prefix))).toBe(true);
    expect(codes.every((code) => /^\d{3}$/.test(code))).toBe(true);
  });
});
