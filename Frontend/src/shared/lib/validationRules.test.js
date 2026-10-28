import { describe, expect, it } from "vitest";
import {
  PASSWORD_RULE_MESSAGE,
  mobileRules,
  optionalPersonNameRules,
  passwordChecks,
  passwordRules,
  persianNameRules,
  requiredMessage,
  usernameRules,
} from "./validationRules";

describe("پیام‌ها هم‌متنِ سرور", () => {
  it("requiredMessage", () => {
    expect(requiredMessage("نام")).toBe("لطفا نام را وارد نمایید");
  });
});

describe("persianNameRules", () => {
  const { required, validate } = persianNameRules("نام");
  it("اجباری و فقط فارسی با یک فاصله", () => {
    expect(required).toBe("لطفا نام را وارد نمایید");
    expect(validate("علی رضا")).toBe(true);
    expect(validate("  علی  ")).toBe(true);
    expect(validate("Ali")).toBe("نام فقط باید حروف فارسی باشد");
    expect(validate("علی  رضا")).toBe("نام فقط باید حروف فارسی باشد");
    expect(validate("علی2")).toBe("نام فقط باید حروف فارسی باشد");
  });
});

describe("optionalPersonNameRules", () => {
  const { validate } = optionalPersonNameRules("نام", "lastName");
  it("هر دو خالی مجاز است", () => {
    expect(validate("", { lastName: "" })).toBe(true);
  });
  it("اگر جفتش پر است، این هم لازم است", () => {
    expect(validate("", { lastName: "رضایی" })).toBe("لطفا نام را وارد نمایید");
  });
  it("پر شده باید فارسی باشد", () => {
    expect(validate("Ali", {})).toBe("نام فقط باید حروف فارسی باشد");
    expect(validate("علی", {})).toBe(true);
  });
});

describe("mobileRules", () => {
  const { validate } = mobileRules();
  it("موبایل با هر نوشتاری، نه شماره‌ی ثابت", () => {
    expect(validate("۰۹۱۲۱۲۳۴۵۶۷")).toBe(true);
    expect(validate("02188887777")).toBe("شماره تماس وارد شده صحیح نمی باشد.");
  });
});

describe("usernameRules", () => {
  const { validate } = usernameRules();
  it("انگلیسی، رقم، _ و -", () => {
    expect(validate("ali.rezaei")).toBe("نام کاربری وارد شده معتبر نیست");
    expect(validate("ali_rezaei-2")).toBe(true);
    expect(validate("علی")).toBe("نام کاربری وارد شده معتبر نیست");
  });
});

describe("رمز عبور", () => {
  const { validate } = passwordRules();
  it("۸ کاراکتر، حرف، رقم و نویسه‌ی خاص", () => {
    expect(validate("Abcdef1!")).toBe(true);
    expect(validate("Abcdefg1")).toBe(PASSWORD_RULE_MESSAGE);
    expect(validate("Abc1!")).toBe(PASSWORD_RULE_MESSAGE);
    expect(validate("Abcdef 1!")).toBe(PASSWORD_RULE_MESSAGE);
    expect(validate("رمزرمز1!")).toBe(PASSWORD_RULE_MESSAGE);
  });

  it("passwordChecks همان شرط‌ها را تک‌تک می‌دهد", () => {
    const failed = (value) => passwordChecks(value).filter((check) => !check.ok).map((check) => check.key);
    expect(failed("Abcdef1!")).toEqual([]);
    expect(failed("abc")).toEqual(["length", "digit", "special"]);
    expect(failed("Abcdef 1!")).toEqual(["allowed"]);
    expect(failed("")).toEqual(["length", "letter", "digit", "special"]);
  });
});
