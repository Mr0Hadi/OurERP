import { createFilterStore } from "@/shared/store/createFilterStore";

/**
 * دقیقاً همان فیلترهایی که `GetUserList` در سرور می‌شناسد و با همان
 * نام‌ها: `fullName`, `personelCode`, `departmentId`, `teamId`,
 * `isActive`. فیلترِ «نقش» وجود ندارد چون سرور رویش فیلتر نمی‌کند.
 *
 * رشته‌ی خالی یعنی «فیلتر نشده» — همان قراردادی که `normalizeFilterValue`
 * در `FilterSelect` رعایت می‌کند و در `api-v1` به `undefined` تبدیل
 * می‌شود تا روی سیم نرود.
 *
 * `departmentId` و `teamId` به هم وابسته‌اند: با عوض‌شدن واحد، تیمِ
 * انتخاب‌شده دیگر معنا ندارد و در `EmployeeFilters` پاک می‌شود.
 *
 * مرتب‌سازی ندارد: `GetUserList` هیچ پارامترِ مرتب‌سازی نمی‌گیرد.
 */
export const useEmployeeFilterStore = createFilterStore({
  filters: {
    fullName: "",
    personelCode: "",
    departmentId: "",
    teamId: "",
    isActive: "",
  },
  defaultSorting: null,
});
