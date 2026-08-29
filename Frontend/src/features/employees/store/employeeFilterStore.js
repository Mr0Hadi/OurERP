// src/features/employees/store/employeeFilterStore.js
import { createFilterStore } from "@/shared/store/createFilterStore";

/**
 * دقیقاً همان فیلترهایی که `GetUserList` در سرور می‌شناسد: متن جست‌وجو،
 * واحد، تیم و وضعیت. فیلترِ «جایگاه» وجود ندارد چون کارمند نقشی ندارد که
 * بشود رویش فیلتر کرد.
 *
 * شناسه‌ها عددی‌اند و رشته‌ی خالی یعنی «فیلتر نشده» — همان قراردادی که
 * `normalizeFilterValue` در `FilterSelect` رعایت می‌کند.
 *
 * `departmentId` و `teamId` به هم وابسته‌اند: با عوض‌شدن واحد، تیمِ
 * انتخاب‌شده دیگر معنا ندارد و در `EmployeeFilters` پاک می‌شود.
 */
export const useEmployeeFilterStore = createFilterStore({
  filters: {
    globalSearch: "",
    departmentId: "",
    teamId: "",
    status: "",
  },
});
