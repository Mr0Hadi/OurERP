import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LEDGER_RANGE_PRESETS, RANGE_PRESETS, TWELVE_MONTH_RANGE_PRESETS, matchPreset } from "./dateRanges";

const rangeOf = (presets, id) => presets.find((preset) => preset.id === id).range();

// ۱۴۰۵/۰۸/۰۶ = 2026-10-28 (فصلِ سوم: مهر–آذر)
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 28, 10, 0, 0));
});
afterEach(() => vi.useRealTimers());

describe("بازه‌های شمسی", () => {
  it("ماهِ جاری و قبل", () => {
    expect(rangeOf(LEDGER_RANGE_PRESETS, "month")).toEqual({ fromDate: "2026-10-23", toDate: "2026-10-28" }); // ۱ آبان
    expect(rangeOf(LEDGER_RANGE_PRESETS, "previousMonth")).toEqual({ fromDate: "2026-09-23", toDate: "2026-10-22" }); // مهر
  });

  it("فصلِ جاری و قبل (اظهارنامه)", () => {
    expect(rangeOf(LEDGER_RANGE_PRESETS, "quarter")).toEqual({ fromDate: "2026-09-23", toDate: "2026-10-28" }); // ۱ مهر
    expect(rangeOf(LEDGER_RANGE_PRESETS, "previousQuarter")).toEqual({ fromDate: "2026-06-22", toDate: "2026-09-22" }); // تیر–شهریور
  });

  it("سالِ جاری و قبل", () => {
    expect(rangeOf(LEDGER_RANGE_PRESETS, "year")).toEqual({ fromDate: "2026-03-21", toDate: "2026-10-28" }); // ۱ فروردین ۱۴۰۵
    expect(rangeOf(LEDGER_RANGE_PRESETS, "previousYear")).toEqual({ fromDate: "2025-03-21", toDate: "2026-03-20" });
  });

  it("۹۰ روزِ اخیر امروز را هم می‌شمارد", () => {
    expect(rangeOf(RANGE_PRESETS, "90days")).toEqual({ fromDate: "2026-07-31", toDate: "2026-10-28" });
  });

  it("«همه» و «۱۲ ماه» بازه‌ی خالی‌اند", () => {
    expect(rangeOf(RANGE_PRESETS, "all")).toEqual({ fromDate: "", toDate: "" });
    expect(rangeOf(TWELVE_MONTH_RANGE_PRESETS, "default")).toEqual({ fromDate: "", toDate: "" });
  });
});

describe("matchPreset", () => {
  it("دکمه‌ی روشن از روی خودِ تاریخ‌ها", () => {
    expect(matchPreset({ fromDate: "", toDate: "" })).toBe("all");
    expect(matchPreset({ fromDate: null, toDate: undefined })).toBe("all");
    expect(matchPreset({ fromDate: "2026-03-21", toDate: "2026-10-28" })).toBe("year");
    expect(matchPreset({ fromDate: "2026-01-01", toDate: "2026-10-28" })).toBe(null);
  });
});
