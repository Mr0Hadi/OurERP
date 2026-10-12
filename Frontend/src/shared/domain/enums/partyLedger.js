/**
 * `PartyLedgerEntryTypeEnum` و `PartyLedgerDirectionEnum` — ردیف‌های دفترِ حسابِ اشخاص
 * (بخش ۵ب و ۲۰ api-guide). روی سیم عدد است؛ سرور عنوانِ فارسیِ هر ردیف را هم
 * (`entryTypeTitle`) می‌فرستد، پس برچسب‌های اینجا فقط برای فیلترها لازم‌اند.
 */
export const PartyLedgerEntryTypeEnum = Object.freeze({
  SALE_INVOICE: 1,
  PURCHASE_INVOICE: 2,
  PURCHASE_SUPPLEMENT: 3,
  INSTALLMENT_CHARGE: 4,
  PAYMENT: 5,
  RETURN_SETTLEMENT: 6,
  /** ردیفی که ردیفِ دیگری را پس می‌گیرد (لغوِ فاکتور، ابطالِ پرداخت). */
  REVERSAL: 7,
  PURCHASE_SHORT_CLOSE: 8,
});

export const PARTY_LEDGER_ENTRY_TYPE_LABELS = Object.freeze({
  [PartyLedgerEntryTypeEnum.SALE_INVOICE]: "فاکتور فروش",
  [PartyLedgerEntryTypeEnum.PURCHASE_INVOICE]: "فاکتور خرید",
  [PartyLedgerEntryTypeEnum.PURCHASE_SUPPLEMENT]: "ضمیمه‌ی خرید",
  [PartyLedgerEntryTypeEnum.INSTALLMENT_CHARGE]: "سود اقساط",
  [PartyLedgerEntryTypeEnum.PAYMENT]: "پرداخت",
  [PartyLedgerEntryTypeEnum.RETURN_SETTLEMENT]: "تسویه‌ی مرجوعی",
  [PartyLedgerEntryTypeEnum.REVERSAL]: "برگشت",
  [PartyLedgerEntryTypeEnum.PURCHASE_SHORT_CLOSE]: "کسریِ خرید",
});

/** جهتِ ردیف: بدهکار یعنی طرف به ما بدهکارتر شد، بستانکار یعنی برعکس. */
export const PartyLedgerDirectionEnum = Object.freeze({
  DEBIT: 1,
  CREDIT: 2,
});

export const PARTY_LEDGER_DIRECTION_LABELS = Object.freeze({
  [PartyLedgerDirectionEnum.DEBIT]: "بدهکار",
  [PartyLedgerDirectionEnum.CREDIT]: "بستانکار",
});
