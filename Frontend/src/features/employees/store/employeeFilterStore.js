import { createFilterStore } from "@/shared/store/createFilterStore";

/**
 * دقیقاً همان فیلترهایی که `GetUserList` در سرور می‌شناسد: نام، کد
 * پرسنلی، واحد، تیم و وضعیت. فیلترِ «نقش» وجود ندارد چون سرور رویش فیلتر
 * نمی‌کند.
 *
 * شناسه‌ها عددی‌اند و رشته‌ی خالی یعنی «فیلتر نشده» — همان قراردادی که
 * `normalizeFilterValue` در `FilterSelect` رعایت می‌کند.
 *
 * `departmentId` و `teamId` به هم وابسته‌اند: با عوض‌شدن واحد، تیمِ
 * انتخاب‌شده دیگر معنا ندارد و در `EmployeeFilters` پاک می‌شود.
 *
 * مرتب‌سازیِ پیش‌فرض روی نام است: `UserListDto` دیگر `createdAt` ندارد.
 */
export const useEmployeeFilterStore = createFilterStore({
  filters: {
    globalSearch: "",
    personelCode: "",
    departmentId: "",
    teamId: "",
    status: "",
  },
  defaultSorting: { id: "fullName", desc: false },
});
