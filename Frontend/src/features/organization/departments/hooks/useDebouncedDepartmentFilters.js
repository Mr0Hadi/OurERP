// src/features/organization/departments/hooks/useDebouncedDepartmentFilters.js
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import { useDepartmentFilterStore } from "../store/departmentFilterStore";

export function useDebouncedDepartmentFilters() {
  const globalSearch = useDepartmentFilterStore((s) => s.globalSearch);

  return { globalSearch: useDebouncedValue(globalSearch) };
}
