import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import { useEmployeeFilterStore } from "../store/employeeFilterStore";

/**
 * فقط متن جست‌وجو تأخیر می‌گیرد؛ Selectها با یک کلیک ست می‌شوند و
 * تأخیرشان فقط حس کندی می‌دهد.
 */
export function useDebouncedEmployeeFilters() {
  const globalSearch = useEmployeeFilterStore((s) => s.globalSearch);
  const personelCode = useEmployeeFilterStore((s) => s.personelCode);
  const departmentId = useEmployeeFilterStore((s) => s.departmentId);
  const teamId = useEmployeeFilterStore((s) => s.teamId);
  const status = useEmployeeFilterStore((s) => s.status);

  return {
    globalSearch: useDebouncedValue(globalSearch),
    personelCode: useDebouncedValue(personelCode),
    departmentId,
    teamId,
    status,
  };
}
