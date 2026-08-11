import { create } from "zustand";
import { devtools } from "zustand/middleware";

const DEFAULT_PAGE_SIZE = 10;
const DEFAULT_SORTING = { id: "createdAt", desc: true };

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * سازنده‌ی استورهای فیلتر لیست‌ها.
 *
 * هر فیلد فیلتر یک اکشن `set<FieldName>` می‌گیرد که علاوه بر مقداردهی،
 * کاربر را به صفحه‌ی اول برمی‌گرداند — چون نتیجه‌ی فیلترشده صفحه‌بندی
 * جدیدی دارد.
 *
 * filters        - آبجکت { fieldName: defaultValue }
 * defaultSorting - مرتب‌سازی اولیه و مقدار بازگشت در resetFilters
 * defaultPageSize- اندازه‌ی صفحه‌ی اولیه
 */
export function createFilterStore({
  filters,
  defaultSorting = DEFAULT_SORTING,
  defaultPageSize = DEFAULT_PAGE_SIZE,
}) {
  const filterKeys = Object.keys(filters);

  // NOTE: رفتار فعلی، اندازه‌ی صفحه را هم به مقدار پیش‌فرض برمی‌گرداند
  // (نه فقط شماره‌ی صفحه را). این عیناً همان رفتار استورهای قبلی است.
  const resetPagination = () => ({ pageIndex: 0, pageSize: defaultPageSize });

  return create(
    devtools((set) => {
      const actions = {};

      for (const key of filterKeys) {
        actions[`set${capitalize(key)}`] = (value) =>
          set({ [key]: value, pagination: resetPagination() });
      }

      return {
        ...filters,
        pagination: { pageIndex: 0, pageSize: defaultPageSize },
        sorting: defaultSorting,

        ...actions,

        setPagination: (newPagination) => set({ pagination: newPagination }),
        setSorting: (newSorting) =>
          set({ sorting: newSorting, pagination: resetPagination() }),

        resetFilters: () =>
          set({
            ...filters,
            pagination: resetPagination(),
            sorting: defaultSorting,
          }),
      };
    }),
  );
}
