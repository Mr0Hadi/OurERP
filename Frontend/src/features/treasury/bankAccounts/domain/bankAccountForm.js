import { BankAccountKindEnum } from "@/shared/domain/enums/bankAccount";
import { normalizeCardNumber, normalizeShaba, validateIranianCard, validateIranianShaba } from "@/shared/lib/iranian-bank";
import { todayIso } from "@/shared/lib/dateUtils";

/**
 * فرمِ صندوق/حسابِ بانکی و فرمِ انتقال — قواعدِ خالص، همان اعتبارسنجی‌های `BankAccountInputValidator` و
 * `TransferBetweenBankAccountsCommandValidator` تا ۴۰۰ پیش از ارسال دیده شود.
 */

/** پیش‌نویسِ خالیِ حساب. مبلغ عدد یا `null` (`PriceInput`)، تاریخ "YYYY-MM-DD". */
export const emptyBankAccountDraft = () => ({
  title: "",
  kind: BankAccountKindEnum.CASH_BOX,
  bankName: "",
  accountNumber: "",
  cardNumber: "",
  iban: "",
  openingBalance: 0,
  openingDate: todayIso(),
  description: "",
});

/** پیش‌نویس از حسابِ سرور (برای ویرایش). */
export const bankAccountDraftOf = (account) => ({
  title: account.title ?? "",
  kind: account.kind,
  bankName: account.bankName ?? "",
  accountNumber: account.accountNumber ?? "",
  cardNumber: account.cardNumber ? normalizeCardNumber(account.cardNumber) : "",
  iban: account.iban ? normalizeShaba(account.iban) : "",
  openingBalance: Number(account.openingBalance) || 0,
  openingDate: String(account.openingDate ?? "").slice(0, 10) || todayIso(),
  description: account.description ?? "",
});

const isBank = (draft) => draft.kind === BankAccountKindEnum.BANK;
const tooLong = (value, max) => value.trim().length > max;

/** خطاهای پیش‌نویسِ حساب، کلید = نامِ فیلد. شبا و کارت با رقمِ کنترلی هم سنجیده می‌شوند (سرور فقط شکل را). */
export function bankAccountDraftErrors(draft) {
  const errors = {};
  if (!draft.title.trim()) errors.title = "عنوان را بنویسید";
  else if (tooLong(draft.title, 100)) errors.title = "عنوان حداکثر ۱۰۰ نویسه است";
  if (draft.openingBalance == null || draft.openingBalance < 0) errors.openingBalance = "مانده‌ی اول دوره را وارد کنید";
  if (tooLong(draft.description, 500)) errors.description = "توضیح حداکثر ۵۰۰ نویسه است";
  if (!isBank(draft)) return errors;

  if (tooLong(draft.bankName, 100)) errors.bankName = "نام بانک حداکثر ۱۰۰ نویسه است";
  if (tooLong(draft.accountNumber, 50)) errors.accountNumber = "شماره حساب حداکثر ۵۰ نویسه است";
  if (draft.cardNumber && !validateIranianCard(draft.cardNumber)) errors.cardNumber = "شماره کارت معتبر نیست (۱۶ رقم)";
  if (draft.iban && !validateIranianShaba(draft.iban)) errors.iban = "شماره شبا معتبر نیست (IR و ۲۴ رقم)";
  return errors;
}

const blank = (value) => value.trim() || null;

/** بدنه‌ی `CreateBankAccount`/`UpdateBankAccount`؛ فیلدهای بانکی برای صندوق فرستاده نمی‌شوند. */
export function toApiBankAccount(draft, id) {
  const bank = isBank(draft);
  return {
    ...(id != null && { id }),
    title: draft.title.trim(),
    kind: draft.kind,
    bankName: bank ? blank(draft.bankName) : null,
    accountNumber: bank ? blank(draft.accountNumber) : null,
    cardNumber: bank ? blank(draft.cardNumber) : null,
    iban: bank && draft.iban ? `IR${normalizeShaba(draft.iban)}` : null,
    openingBalance: draft.openingBalance ?? 0,
    openingDate: draft.openingDate || null,
    description: blank(draft.description),
  };
}

/** پیش‌نویسِ خالیِ انتقال؛ `fromBankAccountId` معمولاً همان حسابِ بازِ صفحه است. */
export const emptyTransferDraft = (fromBankAccountId = null) => ({
  fromBankAccountId,
  toBankAccountId: null,
  amount: null,
  transferredAt: "",
  transferRef: "",
  description: "",
});

export function transferDraftErrors(draft) {
  const errors = {};
  if (!draft.fromBankAccountId) errors.fromBankAccountId = "حساب مبدأ را انتخاب کنید";
  if (!draft.toBankAccountId) errors.toBankAccountId = "حساب مقصد را انتخاب کنید";
  else if (draft.toBankAccountId === draft.fromBankAccountId) errors.toBankAccountId = "مبدأ و مقصد نمی‌توانند یکی باشند";
  if (!(draft.amount > 0)) errors.amount = "مبلغ انتقال باید از صفر بیشتر باشد";
  if (tooLong(draft.transferRef, 64)) errors.transferRef = "شماره پیگیری حداکثر ۶۴ نویسه است";
  if (tooLong(draft.description, 500)) errors.description = "توضیح حداکثر ۵۰۰ نویسه است";
  return errors;
}

/** بدنه‌ی `TransferBetweenAccounts`؛ تاریخِ خالی یعنی «اکنون» در سرور. */
export const toApiTransfer = (draft) => ({
  fromBankAccountId: draft.fromBankAccountId,
  toBankAccountId: draft.toBankAccountId,
  amount: draft.amount,
  transferredAt: draft.transferredAt || null,
  transferRef: blank(draft.transferRef),
  description: blank(draft.description),
});
