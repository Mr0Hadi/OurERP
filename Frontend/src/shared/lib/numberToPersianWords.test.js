import { describe, expect, it } from "vitest";
import { numberToPersianWords, rialAmountInWords } from "./numberToPersianWords";

describe("numberToPersianWords", () => {
  it.each([
    [0, "صفر"],
    [7, "هفت"],
    [15, "پانزده"],
    [20, "بیست"],
    [101, "صد و یک"],
    [1000, "یک هزار"],
    [12500, "دوازده هزار و پانصد"],
    [2_500_000, "دو میلیون و پانصد هزار"],
    [1_000_000_000, "یک میلیارد"],
  ])("%s → %s", (value, words) => {
    expect(numberToPersianWords(value)).toBe(words);
  });

  it("رقمِ فارسی/عربی و جداکننده‌ی هزارگان را می‌خواند", () => {
    expect(numberToPersianWords("۱۲٬۵۰۰")).toBe("دوازده هزار و پانصد");
    expect(numberToPersianWords("١٢,500")).toBe("دوازده هزار و پانصد");
  });

  it("منفی و اعشار", () => {
    expect(numberToPersianWords(-3)).toBe("منفی سه");
    expect(numberToPersianWords("2.5")).toBe("دو ممیز پنج دهم");
    expect(numberToPersianWords("0.25")).toBe("صفر ممیز بیست و پنج صدم");
  });

  it("ورودیِ بی‌عدد رشته‌ی خالی است", () => {
    expect(numberToPersianWords("")).toBe("");
    expect(numberToPersianWords("abc")).toBe("");
  });

  it("بیرون از محدوده پیامِ خودش را دارد", () => {
    expect(numberToPersianWords("1".repeat(30))).toBe("عدد خارج از محدوده است");
  });

  it("حالتِ mixed عددِ گروه‌ها را رقمی می‌نویسد", () => {
    expect(numberToPersianWords(12_500_000, { mode: "mixed" })).toBe("12 میلیون و 500 هزار");
  });

  it("پسوند", () => {
    expect(numberToPersianWords(5, { suffix: " ریال " })).toBe("پنج ریال");
  });
});

describe("rialAmountInWords", () => {
  it("بخش‌پذیر بر ۱۰ به تومان خوانده می‌شود", () => {
    expect(rialAmountInWords(25_000_000)).toBe("دو میلیون و پانصد هزار تومان");
    expect(rialAmountInWords(10)).toBe("یک تومان");
  });

  it("وگرنه به ریال، نه «ممیز … تومان»", () => {
    expect(rialAmountInWords(12_345)).toBe("دوازده هزار و سیصد و چهل و پنج ریال");
  });

  it.each(["", null, undefined, 0, "abc"])("برای %s چیزی نمی‌نویسد", (value) => {
    expect(rialAmountInWords(value)).toBe("");
  });
});
