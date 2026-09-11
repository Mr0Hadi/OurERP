import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import { useDepartmentFilterStore } from "../store/departmentFilterStore";

export function useDebouncedDepartmentFilters() {
  const globalSearch = useDepartmentFilterStore((s) => s.globalSearch);
  const headName = useDepartmentFilterStore((s) => s.headName);

  return {
    globalSearch: useDebouncedValue(globalSearch),
    headName: useDebouncedValue(headName),
  };
}
