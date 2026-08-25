// src/features/organization/departments/store/departmentFilterStore.js
import { createFilterStore } from "@/shared/store/createFilterStore";

export const useDepartmentFilterStore = createFilterStore({
  filters: { globalSearch: "" },
  defaultSorting: { id: "name", desc: false },
});
