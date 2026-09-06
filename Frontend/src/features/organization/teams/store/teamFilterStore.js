import { createFilterStore } from "@/shared/store/createFilterStore";

/** `departmentId` عددی است (`DepartmentEnum`)؛ رشته‌ی خالی یعنی «همه». */
export const useTeamFilterStore = createFilterStore({
  filters: { globalSearch: "", departmentId: "" },
  defaultSorting: { id: "name", desc: false },
});
