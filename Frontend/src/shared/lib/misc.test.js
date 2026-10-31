import { describe, expect, it } from "vitest";
import { formatDigits, formatNumber, formatRial } from "./numberFormat";
import { clampQuantity } from "./quantityUtils";
import { optionsFromLabels } from "./options";
import { DEFAULT_PLATE_VALUE, plateStringToValue, plateValueToString } from "./plate";

describe("numberFormat", () => {
  it("جداکننده و رقمِ فارسی؛ ورودیِ خراب صفر", () => {
    expect(formatNumber(12500)).toBe("۱۲٬۵۰۰");
    expect(formatNumber("abc")).toBe("۰");
    expect(formatNumber(null)).toBe("۰");
    expect(formatRial(1000)).toBe("۱٬۰۰۰ ریال");
  });
  it("formatDigits بی جداکننده", () => {
    expect(formatDigits(12345)).toBe("۱۲۳۴۵");
    expect(formatDigits("")).toBe("");
  });
});

describe("clampQuantity", () => {
  it("بازه‌ی [0, max]", () => {
    expect(clampQuantity("7", 5)).toBe(5);
    expect(clampQuantity(-2, 5)).toBe(0);
    expect(clampQuantity("x", 5)).toBe(0);
    expect(clampQuantity(3, 5)).toBe(3);
  });
});

describe("optionsFromLabels", () => {
  it("کلیدِ رشته‌ای یا عددی", () => {
    const labels = { 1: "الف", 2: "ب" };
    expect(optionsFromLabels(labels)).toEqual([{ value: "1", label: "الف" }, { value: "2", label: "ب" }]);
    expect(optionsFromLabels(labels, { numeric: true })[0]).toEqual({ value: 1, label: "الف" });
  });
});

describe("پلاک", () => {
  it("رفت و برگشت، و مقدارِ نصفه حفظ می‌شود", () => {
    const value = { twoDigit: "12", letter: "ب", threeDigit: "345", serial: "67" };
    expect(plateStringToValue(plateValueToString(value))).toEqual(value);
    expect(plateValueToString({ ...DEFAULT_PLATE_VALUE, twoDigit: "1" })).toBe("1|ا||");
    expect(plateValueToString(DEFAULT_PLATE_VALUE)).toBe("");
    expect(plateStringToValue("")).toBe(DEFAULT_PLATE_VALUE);
  });
});
