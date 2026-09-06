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
 * defaultPageSize- اندازه‌ی صفحه‌ی اولیه (فقط مقدار شروع؛ بعد از آن
 *                  انتخاب کاربر حفظ می‌شود)
 * actions        - اکشن‌های ترکیبی که چند فیلد را با هم ست می‌کنند
 *                  (مثل بازه‌ی قیمت یا فیلترهای میان‌بر). تابعی که
 *                  `{ set, applyFilters }` می‌گیرد و آبجکت اکشن‌ها
 *                  برمی‌گرداند. `applyFilters` همان معنای `set<Field>`
 *                  را دارد: مقداردهی + بازگشت به صفحه‌ی اول.
 */
export function createFilterStore({
  filters,
  defaultSorting = DEFAULT_SORTING,
  defaultPageSize = DEFAULT_PAGE_SIZE,
  actions: extraActions,
}) {
  const filterKeys = Object.keys(filters);

  // تغییر فیلتر یا مرتب‌سازی، کاربر را به صفحه‌ی اول برمی‌گرداند ولی
  // «تعداد ردیف در صفحه» را دست نمی‌زند؛ آن یک انتخاب صریح کاربر است،
  // نه بخشی از فیلتر.
  const toFirstPage = (state) => ({ ...state.pagination, pageIndex: 0 });

  return create(
    devtools((set) => {
      const applyFilters = (values) =>
        set((state) => ({ ...values, pagination: toFirstPage(state) }));

      const actions = {};
      for (const key of filterKeys) {
        actions[`set${capitalize(key)}`] = (value) =>
          applyFilters({ [key]: value });
      }

      return {
        ...filters,
        pagination: { pageIndex: 0, pageSize: defaultPageSize },
        sorting: defaultSorting,

        ...actions,
        ...(extraActions?.({ set, applyFilters }) ?? {}),

        setPagination: (newPagination) => set({ pagination: newPagination }),
        setSorting: (newSorting) =>
          set((state) => ({
            sorting: newSorting,
            pagination: toFirstPage(state),
          })),

        resetFilters: () =>
          set((state) => ({
            ...filters,
            pagination: toFirstPage(state),
            sorting: defaultSorting,
          })),
      };
    }),
  );
}
