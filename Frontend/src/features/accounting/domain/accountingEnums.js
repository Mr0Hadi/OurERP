/**
 * Enumهای بخشِ حسابداری (`Application/Features/Accounting/AccountingEnums.cs`، بخش ۲۰
 * api-guide). همه از `1` شروع می‌شوند تا مقدارِ نفرستاده با «اولین گزینه» اشتباه نشود.
 * روی سیم عدد است؛ اعداد باید دقیقاً با بکند یکی بمانند.
 */

export const AccountingPartyTypeEnum = Object.freeze({
  CUSTOMER: 1,
  SUPPLIER: 2,
});

export const ACCOUNTING_PARTY_TYPE_LABELS = Object.freeze({
  [AccountingPartyTypeEnum.CUSTOMER]: "مشتری",
  [AccountingPartyTypeEnum.SUPPLIER]: "تامین‌کننده",
});

/** رنگِ نشانِ نوعِ طرف‌حساب؛ فقط برای تمایز، نه خوب/بد. */
export const ACCOUNTING_PARTY_TYPE_TONES = Object.freeze({
  [AccountingPartyTypeEnum.CUSTOMER]: "primary",
  [AccountingPartyTypeEnum.SUPPLIER]: "special",
});

/** فیلترِ مانده: مثبت = طرف به ما بدهکار است. */
export const PartyBalanceStateEnum = Object.freeze({
  DEBTOR: 1,
  CREDITOR: 2,
  SETTLED: 3,
});

export const PARTY_BALANCE_STATE_LABELS = Object.freeze({
  [PartyBalanceStateEnum.DEBTOR]: "بدهکار",
  [PartyBalanceStateEnum.CREDITOR]: "بستانکار",
  [PartyBalanceStateEnum.SETTLED]: "تسویه",
});

/** فیلترِ «چقدر از فاکتور مانده». */
export const InvoicePaymentStateEnum = Object.freeze({
  OPEN: 1,
  SETTLED: 2,
  OVERDUE: 3,
});

export const INVOICE_PAYMENT_STATE_LABELS = Object.freeze({
  [InvoicePaymentStateEnum.OPEN]: "باز",
  [InvoicePaymentStateEnum.SETTLED]: "تسویه‌شده",
  [InvoicePaymentStateEnum.OVERDUE]: "سررسیدگذشته",
});

export const DocumentSideEnum = Object.freeze({
  SALE: 1,
  PURCHASE: 2,
});

export const DOCUMENT_SIDE_LABELS = Object.freeze({
  [DocumentSideEnum.SALE]: "فروش",
  [DocumentSideEnum.PURCHASE]: "خرید",
});

export const TradeBreakdownGroupEnum = Object.freeze({
  PRODUCT: 1,
  CATEGORY: 2,
  PARTY: 3,
  USER: 4,
});

/** برچسبِ «طرف‌حساب» و «کاربر» به سمت بستگی دارد (مشتری/تامین‌کننده، فروشنده/خریدار). */
export function tradeBreakdownGroupLabels(side) {
  const isSale = Number(side) !== DocumentSideEnum.PURCHASE;
  return {
    [TradeBreakdownGroupEnum.PRODUCT]: "کالا",
    [TradeBreakdownGroupEnum.CATEGORY]: "دسته‌بندی",
    [TradeBreakdownGroupEnum.PARTY]: isSale ? "مشتری" : "تامین‌کننده",
    [TradeBreakdownGroupEnum.USER]: isSale ? "فروشنده" : "کارمندِ خرید",
  };
}
