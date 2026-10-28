import { describe, expect, it } from "vitest";
import { BankAccountKindEnum } from "@/shared/domain/enums/bankAccount";
import { bankAccountDraftErrors, emptyBankAccountDraft, toApiBankAccount, transferDraftErrors } from "./bankAccountForm";

/** کارتِ معتبر با الگوریتمِ Luhn (همان `validateIranianCard`). */
function luhnCard(prefix15) {
  for (let check = 0; check <= 9; check++) {
    const digits = prefix15 + check;
    const sum = [...digits].reduce((total, char, index) => {
      let digit = Number(char);
      if (index % 2 === 0) digit = digit * 2 > 9 ? digit * 2 - 9 : digit * 2;
      return total + digit;
    }, 0);
    if (sum % 10 === 0) return digits;
  }
  throw new Error("unreachable");
}

/** شبای معتبر با mod-97 (IBAN): IR + دو رقمِ کنترل + ۲۲ رقم. */
function validShaba(bban22) {
  const numeric = BigInt(bban22 + "1827" + "00"); // I=18, R=27
  const check = String(98n - (numeric % 97n)).padStart(2, "0");
  return `IR${check}${bban22}`;
}

const bank = (patch) => ({ ...emptyBankAccountDraft(), kind: BankAccountKindEnum.BANK, title: "ملت", ...patch });

describe("bankAccountDraftErrors", () => {
  it("عنوان و مانده", () => {
    expect(bankAccountDraftErrors({ ...emptyBankAccountDraft(), openingBalance: null })).toEqual({
      title: "عنوان را بنویسید", openingBalance: "مانده‌ی اول دوره را وارد کنید",
    });
  });

  it("کارت و شبا با رقمِ کنترلی؛ برای صندوق سنجیده نمی‌شوند", () => {
    const card = luhnCard("603799123456789");
    const shaba = validShaba("0120000000001234567890");
    expect(bankAccountDraftErrors(bank({ cardNumber: card, iban: shaba }))).toEqual({});
    expect(bankAccountDraftErrors(bank({ cardNumber: card.slice(0, 15) + ((Number(card[15]) + 1) % 10) }))).toHaveProperty("cardNumber");
    expect(bankAccountDraftErrors(bank({ iban: shaba.slice(0, -1) + "9" }))).toHaveProperty("iban");
    expect(bankAccountDraftErrors({ ...emptyBankAccountDraft(), title: "صندوق", cardNumber: "123" })).toEqual({});
  });
});

describe("toApiBankAccount", () => {
  it("فیلدهای بانکی برای صندوق null؛ شبا با پیشوندِ IR", () => {
    const shaba = validShaba("0120000000001234567890");
    expect(toApiBankAccount(bank({ iban: shaba.slice(2), bankName: " ملت " }), 5)).toMatchObject({
      id: 5, bankName: "ملت", iban: shaba,
    });
    expect(toApiBankAccount({ ...emptyBankAccountDraft(), title: " صندوق ", bankName: "x", iban: shaba })).toMatchObject({
      title: "صندوق", bankName: null, iban: null,
    });
  });
});

describe("transferDraftErrors", () => {
  it("مبدأ و مقصدِ یکسان و مبلغ", () => {
    const base = { fromBankAccountId: 1, toBankAccountId: 1, amount: 0, transferRef: "", description: "" };
    expect(transferDraftErrors(base)).toEqual({
      toBankAccountId: "مبدأ و مقصد نمی‌توانند یکی باشند", amount: "مبلغ انتقال باید از صفر بیشتر باشد",
    });
    expect(transferDraftErrors({ ...base, toBankAccountId: 2, amount: 10 })).toEqual({});
  });
});
