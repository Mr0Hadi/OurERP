import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import { useEmployeeFilterStore } from "../store/employeeFilterStore";

/**
 * فقط کادرهای متنی تأخیر می‌گیرند؛ Selectها با یک کلیک ست می‌شوند و
 * تأخیرشان فقط حس کندی می‌دهد.
 */
export function useDebouncedEmployeeFilters() {
  const fullName = useEmployeeFilterStore((s) => s.fullName);
  const personelCode = useEmployeeFilterStore((s) => s.personelCode);
  const departmentId = useEmployeeFilterStore((s) => s.departmentId);
  const teamId = useEmployeeFilterStore((s) => s.teamId);
  const isActive = useEmployeeFilterStore((s) => s.isActive);

  return {
    fullName: useDebouncedValue(fullName),
    personelCode: useDebouncedValue(personelCode),
    departmentId,
    teamId,
    isActive,
  };
}
