import { describe, expect, it } from "vitest";
import { isValidNationalId } from "./nationalId";

describe("isValidNationalId", () => {
  it("نمونه‌های مستندِ خودِ تابع", () => {
    expect(isValidNationalId("0499370899")).toBe(true);
    expect(isValidNationalId("499370899")).toBe(true);
    expect(isValidNationalId("۰۴۹۹۳۷۰۸۹۹")).toBe(true);
    expect(isValidNationalId("0000000000")).toBe(false);
    expect(isValidNationalId("1111111111")).toBe(false);
    expect(isValidNationalId("0499370898")).toBe(false);
  });

  it("طول و ارقامِ میانیِ صفر", () => {
    expect(isValidNationalId("1234567")).toBe(false);
    expect(isValidNationalId("12345678901")).toBe(false);
    expect(isValidNationalId("0490000001")).toBe(false);
    expect(isValidNationalId(null)).toBe(false);
  });

  it("پیشوندِ ناشناخته فقط با checkPrefix رد می‌شود", () => {
    // checksumِ درست با پیشوندِ ۹۹۹: باقیمانده‌ی ۹×۱۰+۹×۹+۹×۸ + ۰… محاسبه در خودِ تست.
    const body = "999000001";
    const sum = [...body].reduce((total, digit, index) => total + Number(digit) * (10 - index), 0);
    const remainder = sum % 11;
    const id = body + (remainder < 2 ? remainder : 11 - remainder);
    expect(isValidNationalId(id, { checkPrefix: false })).toBe(true);
    expect(isValidNationalId(id)).toBe(false);
  });
});
