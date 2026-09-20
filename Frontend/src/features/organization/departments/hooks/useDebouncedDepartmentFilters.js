import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import { useDepartmentFilterStore } from "../store/departmentFilterStore";

export function useDebouncedDepartmentFilters() {
  const name = useDepartmentFilterStore((s) => s.name);
  const headName = useDepartmentFilterStore((s) => s.headName);

  return {
    name: useDebouncedValue(name),
    headName: useDebouncedValue(headName),
  };
}
