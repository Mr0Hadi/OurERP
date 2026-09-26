import { create } from "zustand";
import { persist } from "zustand/middleware";

import { createFilterStore } from "@/shared/store/createFilterStore";
import { DEFAULT_LABEL_TEMPLATE } from "../domain/labelTemplate";
import { LABEL_FILTERS, UNIT_SEGMENTS, segmentNeedsLabels } from "../domain/unitVocabulary";

/**
 * قالبِ برچسب به پرینتر و اسکنرِ انبار بستگی دارد، نه به این دسته‌ی خاص؛
 * پس بینِ نشست‌ها می‌ماند. `fields` جدا ادغام می‌شود تا فیلدِ تازه‌ای که
 * بعداً به قالب اضافه شود، در ذخیره‌ی قدیمیِ مرورگر گم نشود.
 */
export const useLabelTemplateStore = create(
  persist(
    (set) => ({
      template: DEFAULT_LABEL_TEMPLATE,
      updateTemplate: (patch) =>
        set((state) => ({ template: { ...state.template, ...patch } })),
      setField: (key, value) =>
        set((state) => ({
          template: {
            ...state.template,
            fields: { ...state.template.fields, [key]: value },
          },
        })),
      resetTemplate: () => set({ template: DEFAULT_LABEL_TEMPLATE }),
    }),
    {
      name: "unit-label-template",
      version: 1,
      merge: (persisted, current) => {
        const saved = persisted?.template ?? {};
        return {
          ...current,
          template: {
            ...DEFAULT_LABEL_TEMPLATE,
            ...saved,
            custom: { ...DEFAULT_LABEL_TEMPLATE.custom, ...saved.custom },
            fields: { ...DEFAULT_LABEL_TEMPLATE.fields, ...saved.fields },
          },
        };
      },
    },
  ),
);

/** فیلترهایی که از آدرس (`?productId=…`) هم پر می‌شوند — پیوند از صفحه‌های دیگر. */
export const URL_FILTER_KEYS = Object.freeze([
  "segment",
  "productId",
  "purchaseId",
  "saleId",
  "supplierId",
  "customerId",
  "custodyReason",
  "labelFilter",
]);

export const EMPTY_UNIT_FILTERS = Object.freeze({
  segment: UNIT_SEGMENTS.ALL,
  labelFilter: "",
  search: "",
  productId: "",
  custodyReason: "",
  supplierId: "",
  customerId: "",
  purchaseId: "",
  saleId: "",
  fromDate: "",
  toDate: "",
  fromSerial: "",
  toSerial: "",
});

/**
 * فیلترهای صفحه‌ی دانه‌ها. `segment` جایگاهِ دانه است (انبار، قرنطینه، نزدِ
 * مشتری…) و `labelFilter` («نخورده» = صفِ چاپ) روی همان جایگاه می‌نشیند؛ بقیه‌ی
 * فیلترها بینِ جایگاه‌ها مشترک‌اند تا «کالای X» با عوض کردنِ جایگاه بماند.
 */
export const useProductUnitFilterStore = createFilterStore({
  filters: EMPTY_UNIT_FILTERS,
  defaultSorting: null,
  defaultPageSize: 20,
  actions: ({ applyFilters }) => ({
    // سریال per-product است (هر کالا از ۱ می‌شمارد)، پس بازه‌ی سریالِ
    // کالای قبلی برای کالای جدید بی‌معناست.
    setProductId: (productId) =>
      applyFilters({ productId, fromSerial: "", toSerial: "" }),
    // علتِ قرنطینه فقط در جایگاهِ قرنطینه معنا دارد.
    // فیلترِ برچسب هم در جایگاهی که برچسب ندارد (فروخته، اسقاط…) بی‌معناست.
    setSegment: (segment) =>
      applyFilters({
        segment,
        ...(segment === UNIT_SEGMENTS.QUARANTINE ? {} : { custodyReason: "" }),
        ...(segmentNeedsLabels(segment) ? {} : { labelFilter: "" }),
      }),
    /** صفِ چاپ: همه‌ی دانه‌های هنوز در انبار که برچسب نخورده‌اند. */
    openPrintQueue: () =>
      applyFilters({ segment: UNIT_SEGMENTS.ALL, labelFilter: LABEL_FILTERS.UNPRINTED }),
    /** فیلترهای جزئی — جایگاه، جست‌وجو و برچسب می‌مانند. */
    clearAdvanced: () =>
      applyFilters({
        productId: "",
        custodyReason: "",
        supplierId: "",
        customerId: "",
        purchaseId: "",
        saleId: "",
        fromDate: "",
        toDate: "",
        fromSerial: "",
        toSerial: "",
      }),
    /** پیوندِ ورودی: همه‌ی فیلترها از نو، فقط با همین مقادیر. */
    openWith: (values) => applyFilters({ ...EMPTY_UNIT_FILTERS, ...values }),
    clearAll: () => applyFilters({ ...EMPTY_UNIT_FILTERS }),
  }),
});
