/**
 * مرتب‌سازیِ سمتِ سرورِ لیست‌ها — `SortBy` + `SortDirection` روی هر
 * `Get*ListQuery`ِ بکند (`Application/Common/Queries/SortingExtensions.cs`).
 *
 * هر لیست شمارشِ `SortBy`ِ خودش را دارد (مثلاً `PurchaseListSortEnum`)؛ جدول
 * با شناسه‌ی ستون (`sorting.id`) کار می‌کند و هر سرویس یک نقشه‌ی «ستون →
 * عددِ enum» به این تابع می‌دهد. ستونی که در نقشه نیست یعنی ترتیبِ پیش‌فرضِ
 * سرور (جدیدترین‌ها اول).
 */
export const SortDirectionEnum = Object.freeze({ ASC: 0, DESC: 1 });

export function toApiSort(sorting, columns) {
  if (!sorting?.id) return {};
  const sortBy = columns[sorting.id];
  if (sortBy == null) return {};
  return {
    sortBy,
    sortDirection: sorting.desc ? SortDirectionEnum.DESC : SortDirectionEnum.ASC,
  };
}
