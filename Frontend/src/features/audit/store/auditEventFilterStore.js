import { createFilterStore } from "@/shared/store/createFilterStore";

const FILTERS = {
  fromDate: "",
  toDate: "",
  userId: "",
  action: "",
  entityType: "",
  entityKey: "",
  documentKind: "",
  documentId: "",
};

const DEFAULT_SORTING = { id: "occurredAt", desc: true };

/**
 * فیلترهای گزارشِ فعالیت با همان نام‌های `GetAuditEventListQuery`.
 *
 * - `entityKey` بدونِ `entityType` و `documentId` بدونِ `documentKind` برای سرور معنا ندارد؛
 *   با پاک‌شدنِ نوع، کلید هم پاک می‌شود.
 * - `applyPreset(values)`: همه به پیش‌فرض و بعد `values` — برای پیوندهایی مثلِ «فعالیت‌های این
 *   کارمند» (`?userId=7`) که باید صفحه را با *فقط* همان فیلتر باز کنند (`useUrlPreset`).
 */
export const useAuditEventFilterStore = createFilterStore({
  filters: FILTERS,
  defaultSorting: DEFAULT_SORTING,
  actions: ({ set, applyFilters }) => ({
    setRange: ({ fromDate, toDate }) => applyFilters({ fromDate: fromDate || "", toDate: toDate || "" }),
    setEntityType: (entityType) => applyFilters(entityType ? { entityType } : { entityType: "", entityKey: "" }),
    setDocumentKind: (documentKind) =>
      applyFilters(documentKind ? { documentKind } : { documentKind: "", documentId: "" }),
    applyPreset: (values) =>
      set((state) => ({
        ...FILTERS,
        ...values,
        sorting: DEFAULT_SORTING,
        pagination: { ...state.pagination, pageIndex: 0 },
      })),
  }),
});
