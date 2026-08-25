// src/features/employees/store/employeeFilterStore.js
import { createFilterStore } from "@/shared/store/createFilterStore";

/**
 * همه‌ی فیلترهای enum عددی‌اند (`UserRoleEnum`, `AccountStatusEnum`,
 * `DepartmentEnum`) و رشته‌ی خالی یعنی «فیلتر نشده» — همان قراردادی که
 * `normalizeFilterValue` در `FilterSelect` رعایت می‌کند.
 */
export const useEmployeeFilterStore = createFilterStore({
  filters: {
    globalSearch: "",
    roleId: "",
    status: "",
    departmentId: "",
    teamId: "",
  },
});
