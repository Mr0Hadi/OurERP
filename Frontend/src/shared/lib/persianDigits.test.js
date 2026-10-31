import { describe, expect, it } from "vitest";
import { normalizePersianDigits, toPersianDigits } from "./persianDigits";

describe("normalizePersianDigits", () => {
  it("رقمِ فارسی و عربی → لاتین، بقیه دست‌نخورده", () => {
    expect(normalizePersianDigits("۰۹۱۲-٣٤٥ abc")).toBe("0912-345 abc");
  });
});

describe("toPersianDigits", () => {
  it("صفرِ اول و خط‌تیره می‌مانند", () => {
    expect(toPersianDigits("0012")).toBe("۰۰۱۲");
    expect(toPersianDigits("INV-1405-0012")).toBe("INV-۱۴۰۵-۰۰۱۲");
  });

  it("عدد و null", () => {
    expect(toPersianDigits(305)).toBe("۳۰۵");
    expect(toPersianDigits(null)).toBe("");
  });
});
