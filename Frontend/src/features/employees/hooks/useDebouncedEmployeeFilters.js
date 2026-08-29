// src/features/employees/hooks/useDebouncedEmployeeFilters.js
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import { useEmployeeFilterStore } from "../store/employeeFilterStore";

/**
 * فقط متن جست‌وجو تأخیر می‌گیرد؛ Selectها با یک کلیک ست می‌شوند و
 * تأخیرشان فقط حس کندی می‌دهد.
 */
export function useDebouncedEmployeeFilters() {
  const globalSearch = useEmployeeFilterStore((s) => s.globalSearch);
  const departmentId = useEmployeeFilterStore((s) => s.departmentId);
  const teamId = useEmployeeFilterStore((s) => s.teamId);
  const status = useEmployeeFilterStore((s) => s.status);

  return {
    globalSearch: useDebouncedValue(globalSearch),
    departmentId,
    teamId,
    status,
  };
}
