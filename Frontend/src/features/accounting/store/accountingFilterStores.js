import { create } from "zustand";
import { devtools } from "zustand/middleware";

import { createFilterStore } from "@/shared/store/createFilterStore";
import { DEFAULT_REPORT_PERIOD } from "@/shared/domain/enums/reportPeriod";
import { DocumentSideEnum, TradeBreakdownGroupEnum } from "../domain/accountingEnums";

/**
 * استورهای فیلترِ صفحه‌های حسابداری — هر صفحه استورِ خودش را دارد تا بازه‌ی یک دفتر روی
 * دیگری ننشیند. نامِ هر فیلد همان پارامترِ سرور است (بخش ۲۰ api-guide).
 *
 * `applyPreset(values)`: همه‌ی فیلترها به پیش‌فرض و بعد `values` — برای پیوندهای داشبورد و
 * جدول‌های دیگر (`?paymentState=3`، `?customerId=5`) که باید صفحه را با *فقط* همان فیلتر باز
 * کنند، نه روی فیلترهای قبلیِ کاربر.
 */
function createAccountingFilterStore({ filters, defaultSorting, actions }) {
  return createFilterStore({
    filters,
    defaultSorting,
    actions: (helpers) => ({
      applyPreset: (values) =>
        helpers.set((state) => ({
          ...filters,
          ...values,
          sorting: defaultSorting,
          pagination: { ...state.pagination, pageIndex: 0 },
        })),
      ...(actions?.(helpers) ?? {}),
    }),
  });
}

const RANGE = { fromDate: "", toDate: "" };

/** هر تغییرِ بازه یک‌جا (دکمه‌های آماده هر دو سرِ بازه را با هم عوض می‌کنند). */
const rangeAction = ({ applyFilters }) => ({
  setRange: ({ fromDate, toDate }) => applyFilters({ fromDate: fromDate || "", toDate: toDate || "" }),
});

export const usePartyBalanceFilterStore = createAccountingFilterStore({
  filters: {
    partyType: "",
    balanceState: "",
    minBalance: "",
    maxBalance: "",
    overdueOnly: false,
    search: "",
  },
  defaultSorting: { id: "balance", desc: true },
});

export const usePartyLedgerFilterStore = createAccountingFilterStore({
  filters: {
    ...RANGE,
    partyType: "",
    customerId: "",
    supplierId: "",
    entryTypes: [],
    direction: "",
    excludeReversed: false,
    saleId: "",
    purchaseId: "",
    search: "",
  },
  defaultSorting: { id: "occurredAt", desc: true },
  actions: (helpers) => ({
    ...rangeAction(helpers),
    // نوعِ طرف‌حساب عوض شد → طرفِ انتخاب‌شده‌ی نوعِ دیگر معنا ندارد.
    setPartyType: (partyType) => helpers.applyFilters({ partyType, customerId: "", supplierId: "" }),
  }),
});

/** دفترِ فروش و دفترِ خرید: یک شکل، دو استور (بازه و فیلترِ یکی روی دیگری نمی‌نشیند). */
function createInvoiceJournalStore({ partyIdKey, userIdKey }) {
  return createAccountingFilterStore({
    filters: {
      ...RANGE,
      fromDueDate: "",
      toDueDate: "",
      statuses: [],
      [partyIdKey]: "",
      [userIdKey]: "",
      paymentType: "",
      paymentState: "",
      search: "",
    },
    defaultSorting: { id: "invoiceDate", desc: true },
    actions: rangeAction,
  });
}

export const INVOICE_JOURNAL_STORES = {
  [DocumentSideEnum.SALE]: createInvoiceJournalStore({ partyIdKey: "customerId", userIdKey: "salesUserId" }),
  [DocumentSideEnum.PURCHASE]: createInvoiceJournalStore({ partyIdKey: "supplierId", userIdKey: "purchasingUserId" }),
};

export const useSaleLineFilterStore = createAccountingFilterStore({
  filters: {
    ...RANGE,
    statuses: [],
    customerId: "",
    productCategoryId: "",
    taxCategory: "",
    saleId: "",
    productId: "",
    search: "",
  },
  defaultSorting: { id: "invoiceDate", desc: true },
  actions: rangeAction,
});

export const usePaymentJournalFilterStore = createAccountingFilterStore({
  filters: {
    ...RANGE,
    direction: "",
    types: [],
    purpose: "",
    documentSide: "",
    customerId: "",
    supplierId: "",
    recordedByUserId: "",
    includeVoided: false,
    saleId: "",
    purchaseId: "",
    search: "",
  },
  defaultSorting: { id: "paidAt", desc: true },
  actions: (helpers) => ({
    ...rangeAction(helpers),
    // مشتری فقط روی فروش و تامین‌کننده فقط روی خرید معنا دارد.
    setDocumentSide: (documentSide) =>
      helpers.applyFilters({
        documentSide,
        ...(documentSide === DocumentSideEnum.SALE && { supplierId: "" }),
        ...(documentSide === DocumentSideEnum.PURCHASE && { customerId: "" }),
      }),
  }),
});

export const useInventoryValuationFilterStore = createAccountingFilterStore({
  filters: {
    productCategoryId: "",
    onlyWithValue: false,
    search: "",
  },
  defaultSorting: { id: "totalValue", desc: true },
});

export const useTradeBreakdownFilterStore = createAccountingFilterStore({
  filters: {
    ...RANGE,
    side: DocumentSideEnum.SALE,
    groupBy: TradeBreakdownGroupEnum.PRODUCT,
    partyId: "",
    productCategoryId: "",
    productId: "",
    search: "",
  },
  defaultSorting: { id: "netAmount", desc: true },
  actions: (helpers) => ({
    ...rangeAction(helpers),
    // `partyId` مشتری است یا تامین‌کننده، بسته به سمت؛ با عوضِ سمت بی‌معنا می‌شود.
    setSide: (side) => helpers.applyFilters({ side, partyId: "" }),
    // جست‌وجو روی عنوانِ گروه است؛ گروه‌بندیِ دیگر یعنی عنوان‌های دیگر.
    setGroupBy: (groupBy) => helpers.applyFilters({ groupBy, search: "" }),
  }),
});

/**
 * داشبورد و گزارشِ مالیات صفحه‌بندی ندارند؛ فقط بازه و اندازه‌ی دوره. مثلِ
 * `dashboardFilterStore` از `createFilterStore` ارث نمی‌برند. بازه‌ی خالی = پیش‌فرضِ سرور
 * (دوازده ماهِ اخیر).
 */
function createPeriodStore(defaultPeriodType) {
  const initial = { periodType: defaultPeriodType, fromDate: "", toDate: "" };
  return create(
    devtools((set) => ({
      ...initial,
      setPeriodType: (periodType) => set({ periodType: Number(periodType) }),
      setRange: ({ fromDate, toDate }) => set({ fromDate: fromDate || "", toDate: toDate || "" }),
      resetFilters: () => set(initial),
    })),
  );
}

export const useAccountingDashboardStore = createPeriodStore(DEFAULT_REPORT_PERIOD);

/** فصلی — دوره‌ی اظهارنامه‌ی ارزش افزوده (`ReportPeriodTypeEnum.QUARTERLY`، پیش‌فرضِ سرور). */
export const useTaxReportStore = createPeriodStore(3);
