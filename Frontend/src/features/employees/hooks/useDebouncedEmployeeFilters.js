// src/features/employees/hooks/useDebouncedEmployeeFilters.js
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import { useEmployeeFilterStore } from "../store/employeeFilterStore";

/**
 * فقط متن جست‌وجو تأخیر می‌گیرد؛ Selectها با یک کلیک ست می‌شوند و
 * تأخیرشان فقط حس کندی می‌دهد.
 */
export function useDebouncedEmployeeFilters() {
  const globalSearch = useEmployeeFilterStore((s) => s.globalSearch);
  const roleId = useEmployeeFilterStore((s) => s.roleId);
  const isActive = useEmployeeFilterStore((s) => s.isActive);

  return {
    globalSearch: useDebouncedValue(globalSearch),
    roleId,
    isActive,
  };
}
