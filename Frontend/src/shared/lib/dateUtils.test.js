import { describe, expect, it } from "vitest";
import {
  gregorianToPersian,
  gregorianToPersianDateTime,
  nowLocalIso,
  persianTimeOf,
  toDateOnly,
  todayIso,
} from "./dateUtils";

describe("gregorianToPersian", () => {
  it("تاریخ و timestampِ سرور", () => {
    expect(gregorianToPersian("2024-08-02")).toBe("۱۴۰۳/۰۵/۱۲");
    expect(gregorianToPersian("2024-08-02T10:15:00Z")).toBe("۱۴۰۳/۰۵/۱۲");
    expect(gregorianToPersian("2026-03-21")).toBe("۱۴۰۵/۰۱/۰۱");
  });
  it("خالی/خراب → خالی", () => {
    expect(gregorianToPersian("")).toBe("");
    expect(gregorianToPersian(null)).toBe("");
  });
});

describe("toDateOnly", () => {
  it("بخشِ تاریخ؛ DateTime.MinValue یعنی بی‌تاریخ", () => {
    expect(toDateOnly("2026-04-01T00:00:00")).toBe("2026-04-01");
    expect(toDateOnly("0001-01-01T00:00:00")).toBe("");
    expect(toDateOnly("not a date")).toBe("");
    expect(toDateOnly(undefined)).toBe("");
  });
});

describe("وقتِ محلی، نه UTC", () => {
  // ۰۱:۳۰ بامدادِ محلی: toISOString اینجا (برای منطقه‌های جلوتر از UTC) روزِ قبل را می‌داد.
  const lateNight = new Date(2026, 9, 15, 1, 30, 5);
  it("todayIso و nowLocalIso", () => {
    expect(todayIso(lateNight)).toBe("2026-10-15");
    expect(nowLocalIso(lateNight)).toBe("2026-10-15T01:30:05");
  });
});

describe("persianTimeOf / gregorianToPersianDateTime", () => {
  it("ساعت از خودِ متن", () => {
    expect(persianTimeOf("2026-10-15T10:42:11")).toBe("۱۰:۴۲");
    expect(persianTimeOf("2026-10-15")).toBe("");
  });
  it("نیمه‌شبِ تاریخِ بی‌ساعت حذف می‌شود", () => {
    expect(gregorianToPersianDateTime("2026-10-15T10:42:11")).toBe("۱۴۰۵/۰۷/۲۳ ۱۰:۴۲");
    expect(gregorianToPersianDateTime("2026-10-15T00:00:00")).toBe("۱۴۰۵/۰۷/۲۳");
    expect(gregorianToPersianDateTime("")).toBe("");
  });
});
