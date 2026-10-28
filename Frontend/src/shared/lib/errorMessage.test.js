import { describe, expect, it } from "vitest";
import { ERROR_MESSAGES, extractServerMessage, getErrorMessage, isUserFacingMessage } from "./errorMessage";

const axiosError = (status, extra = {}) => ({ isAxiosError: true, response: status ? { status } : undefined, ...extra });

describe("getErrorMessage", () => {
  it("پیامِ سرور مقدم است", () => {
    expect(getErrorMessage({ serverMessage: "کالا موجود نیست", isAxiosError: true }, "خطا")).toBe("کالا موجود نیست");
  });

  it("قطعیِ شبکه، تایم‌اوت و لغو", () => {
    expect(getErrorMessage(axiosError(null, { code: "ERR_NETWORK" }), "x")).toBe(ERROR_MESSAGES.NETWORK);
    expect(getErrorMessage(axiosError(null, { code: "ECONNABORTED" }), "x")).toBe(ERROR_MESSAGES.TIMEOUT);
    expect(getErrorMessage(axiosError(null, { code: "ERR_CANCELED" }), "x")).toBe(ERROR_MESSAGES.CANCELED);
  });

  it("۴۰۱/۴۰۳ از متنِ عملیات مشخص‌ترند؛ بقیه متنِ عملیات", () => {
    expect(getErrorMessage(axiosError(403), "خطا در حذف")).toBe(ERROR_MESSAGES.FORBIDDEN);
    expect(getErrorMessage(axiosError(500), "خطا در حذف")).toBe("خطا در حذف");
    expect(getErrorMessage(axiosError(500))).toBe(ERROR_MESSAGES.SERVER);
    expect(getErrorMessage(axiosError(409))).toBe(ERROR_MESSAGES.CONFLICT);
    expect(getErrorMessage(axiosError(422))).toBe(ERROR_MESSAGES.INVALID_INPUT);
  });

  it("خطای فارسیِ خودِ فرانت نمایش داده می‌شود، انگلیسی نه", () => {
    expect(getErrorMessage(new Error("مبلغ نامعتبر است"), "x")).toBe("مبلغ نامعتبر است");
    expect(getErrorMessage(new Error("Cannot read properties"), "خطا")).toBe("خطا");
    expect(getErrorMessage(null)).toBe(ERROR_MESSAGES.UNKNOWN);
  });
});

describe("extractServerMessage", () => {
  it("ResponseDto", () => {
    expect(extractServerMessage({ Message: "شماره تکراری است", Data: null })).toBe("شماره تکراری است");
  });
  it("ProblemDetails: پیامِ فیلد به‌جای titleِ انگلیسی", () => {
    expect(
      extractServerMessage({ title: "One or more validation errors occurred", errors: { Phone: ["شماره نامعتبر است"] } }),
    ).toBe("شماره نامعتبر است");
  });
  it("پیامِ فنیِ انگلیسی نمایش داده نمی‌شود", () => {
    expect(extractServerMessage({ Message: "Object reference not set" })).toBe(null);
    expect(extractServerMessage("text")).toBe(null);
    expect(isUserFacingMessage("خطا")).toBe(true);
  });
});
