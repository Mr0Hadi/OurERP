import axiosInstance from "@/shared/services/api/axios";
import { compactParams, normalizeListResponse } from "@/shared/services/api/contract";

/**
 * کنترلرِ `api/Accounting` — داشبورد و دفترهای حسابداری (بخش ۲۰ api-guide). همه `GET` و
 * فقط‌خواندنی‌اند و یک دسترسی دارند: `AccountingView`.
 *
 * قرارداد‌های مشترک:
 *  - فروش و خرید **بر اساسِ فاکتورِ صادرشده** و `invoiceDate`اند؛ بهای تمام‌شده و سود اینجا
 *    نیست (فیچرِ جدای «بهای تمام‌شده» هنوز طراحی نشده).
 *  - هر فهرست کنارِ ردیف‌ها یک `summary` دارد که **جمعِ همه‌ی ردیف‌های فیلتر** است، نه
 *    فقط همان صفحه. `normalizeListResponse` آن را نگه نمی‌دارد، پس اینجا کنارش گذاشته می‌شود.
 *  - مبالغ ریالی‌اند. «مانده» = قابل‌پرداخت − پرداخت‌شده؛ منفی یعنی اضافه‌پرداخت.
 *  - بازه‌ها هر دو روز را شامل می‌شوند.
 *
 * پارامترها همان نام‌های سرورند و از `listQuery` (صفحه، مرتب‌سازی، حذفِ خالی‌ها) می‌آیند.
 */

/** فهرستِ صفحه‌بندی‌شده + `summary`ِ کلِ فیلتر. */
async function fetchJournal(url, params, itemsKey) {
  const { data } = await axiosInstance.get(url, { params });
  return { ...normalizeListResponse(data, { itemsKey }), summary: data?.summary ?? null };
}

// ─── مرتب‌سازی: شناسه‌ی ستونِ جدول → عددِ `*SortEnum`ِ هر endpoint ──────────

/** `PartyBalanceListSortEnum` — پیش‌فرضِ سرور: بزرگ‌ترین مانده اول. */
export const PARTY_BALANCE_SORT_COLUMNS = {
  balance: 0,
  name: 1,
  totalDebit: 2,
  totalCredit: 3,
  lastEntryAt: 4,
  lastPaymentAt: 5,
};

/** `PartyLedgerEntryListSortEnum` — پیش‌فرض: تازه‌ترین اول. */
export const PARTY_LEDGER_SORT_COLUMNS = {
  occurredAt: 0,
  amount: 1,
  partyName: 2,
};

/**
 * `SaleJournalSortEnum` و `PurchaseJournalSortEnum` (هم‌شماره). ستونِ نامِ طرف در دو دفتر
 * شناسه‌ی جدا دارد (`customerName`/`supplierName`) ولی همان عدد است.
 */
export const INVOICE_JOURNAL_SORT_COLUMNS = {
  invoiceDate: 0,
  invoiceNumber: 1,
  customerName: 2,
  supplierName: 2,
  dueDate: 3,
  totalAmount: 4,
  paidAmount: 5,
  remainingAmount: 6,
};

/** `SaleLineJournalSortEnum`. */
export const SALE_LINE_SORT_COLUMNS = {
  invoiceDate: 0,
  invoiceNumber: 1,
  productName: 2,
  quantity: 3,
  netAmount: 4,
  totalAmount: 5,
};

/** `PaymentJournalSortEnum` — پیش‌فرض: تازه‌ترین پرداخت اول. */
export const PAYMENT_JOURNAL_SORT_COLUMNS = {
  paidAt: 0,
  recordedAt: 1,
  amount: 2,
  partyName: 3,
};

/** `InventoryValuationSortEnum` — پیش‌فرض: بیشترین ارزش اول. */
export const INVENTORY_VALUATION_SORT_COLUMNS = {
  totalValue: 0,
  name: 1,
  code: 2,
  stock: 3,
  averageCost: 4,
  offPoolValue: 5,
};

/** `TradeBreakdownSortEnum` — پیش‌فرض: بیشترین خالص اول. */
export const TRADE_BREAKDOWN_SORT_COLUMNS = {
  netAmount: 0,
  title: 1,
  quantity: 2,
  invoiceCount: 3,
  totalAmount: 4,
};

// ─── endpointها ────────────────────────────────────────────────────────────

/**
 * `GET GetAccountingDashboard` — کاشی‌ها و نمودارِ داشبورد در یک پاسخ.
 * بازه‌ی خالی = دوازده ماهِ منتهی به امروز (پیش‌فرضِ سرور)؛ `periodType` اندازه‌ی دوره‌های
 * `series` است. ارقامِ «لحظه‌ای» (مانده‌ها، سنی‌بندی، معوق‌ها، اقساط، موجودی) به بازه ربطی ندارند.
 */
export async function fetchAccountingDashboard(params) {
  const { data } = await axiosInstance.get("/Accounting/GetAccountingDashboard", {
    params: compactParams(params),
  });
  return data;
}

/** `GET GetPartyBalanceList` — مشتری‌ها و تامین‌کننده‌ها در یک جدول؛ مانده از دفتر، سنی‌بندی از اسنادِ باز. */
export function fetchPartyBalances(params) {
  return fetchJournal("/Accounting/GetPartyBalanceList", params, "partyBalanceList");
}

/** `GET GetPartyLedgerEntryList` — همه‌ی ردیف‌های دفترِ حسابِ اشخاص (مانده‌ی جاری ندارد؛ صفحه‌بندی‌شده است). */
export function fetchPartyLedgerEntries(params) {
  return fetchJournal("/Accounting/GetPartyLedgerEntryList", params, "partyLedgerEntryList");
}

/** `GET GetSaleJournal` — هر فاکتورِ فروش یک ردیف. */
export function fetchSaleJournal(params) {
  return fetchJournal("/Accounting/GetSaleJournal", params, "saleJournal");
}

/** `GET GetPurchaseJournal` — هر فاکتورِ خرید یک ردیف. */
export function fetchPurchaseJournal(params) {
  return fetchJournal("/Accounting/GetPurchaseJournal", params, "purchaseJournal");
}

/** `GET GetSaleLineJournal` — ریزِ اقلامِ فروش. */
export function fetchSaleLineJournal(params) {
  return fetchJournal("/Accounting/GetSaleLineJournal", params, "saleLineJournal");
}

/**
 * `GET GetPaymentJournal` — همه‌ی ردیف‌های پرداختِ فروش و خرید (اقساط هم). حسابِ صندوق و
 * بانک هنوز نیست؛ تفکیک فقط بر اساسِ روشِ پرداخت است. ردیفِ باطل‌شده در `summary` نیست.
 */
export function fetchPaymentJournal(params) {
  return fetchJournal("/Accounting/GetPaymentJournal", params, "paymentJournal");
}

/** `GET GetTaxReport` — `{ periods, totals }`؛ پیش‌فرض: فصلی، دوازده ماهِ اخیر. صفحه‌بندی ندارد. */
export async function fetchTaxReport(params) {
  const { data } = await axiosInstance.get("/Accounting/GetTaxReport", {
    params: compactParams(params),
  });
  return { periods: data?.periods ?? [], totals: data?.totals ?? null };
}

/** `GET GetInventoryValuation` — ارزشِ موجودیِ همین حالا، از دفترِ ارزشِ موجودی (بدونِ محاسبه‌ی بها). */
export function fetchInventoryValuation(params) {
  return fetchJournal("/Accounting/GetInventoryValuation", params, "inventoryValuation");
}

/** `GET GetTradeBreakdown` — فروش یا خرید به تفکیکِ کالا، دسته، طرف‌حساب یا کاربر. */
export function fetchTradeBreakdown(params) {
  return fetchJournal("/Accounting/GetTradeBreakdown", params, "tradeBreakdown");
}
