import { describe, expect, it } from "vitest";
import { isValidIranPhone, normalizeIranPhone } from "./iranianMobile";

describe("normalizeIranPhone", () => {
  it.each([
    ["09121234567", "09121234567"],
    ["+989121234567", "09121234567"],
    ["00989121234567", "09121234567"],
    ["989121234567", "09121234567"],
    ["9121234567", "09121234567"],
    ["۰۹۱۲ ۱۲۳-۴۵۶۷", "09121234567"],
    ["(0912) 123.4567", "09121234567"],
  ])("%s → %s", (input, expected) => {
    expect(normalizeIranPhone(input)).toBe(expected);
  });

  it("ورودیِ نامعتبر فقط رقم‌هایش می‌ماند", () => {
    expect(normalizeIranPhone("021-8888 7777")).toBe("02188887777");
    expect(normalizeIranPhone(null)).toBe("");
  });
});

describe("isValidIranPhone", () => {
  it("فقط موبایل", () => {
    expect(isValidIranPhone("+98 912 123 4567")).toBe(true);
    expect(isValidIranPhone("02188887777")).toBe(false);
    expect(isValidIranPhone("0912123456")).toBe(false);
  });
});
