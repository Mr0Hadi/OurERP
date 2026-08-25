// src/features/employees/store/employeeFilterStore.js
import { createFilterStore } from "@/shared/store/createFilterStore";

/**
 * `roleId` و `status` هر دو enum عددی‌اند (`UserRoleEnum`,
 * `AccountStatusEnum`) و رشته‌ی خالی یعنی «فیلتر نشده» — همان قراردادی
 * که `normalizeFilterValue` در `FilterSelect` رعایت می‌کند.
 */
export const useEmployeeFilterStore = createFilterStore({
  filters: {
    globalSearch: "",
    roleId: "",
    status: "",
  },
});
