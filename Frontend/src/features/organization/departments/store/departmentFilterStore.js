import { createFilterStore } from "@/shared/store/createFilterStore";

/**
 * `globalSearch` روی نامِ واحد و `headName` روی نامِ مدیر — دو فیلترِ
 * مستقلِ `GetDepartmentList` که سرور با هم AND می‌کند.
 */
export const useDepartmentFilterStore = createFilterStore({
  filters: { globalSearch: "", headName: "" },
  defaultSorting: { id: "name", desc: false },
});
