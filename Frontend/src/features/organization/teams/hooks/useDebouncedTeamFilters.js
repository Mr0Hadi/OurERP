import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import { useTeamFilterStore } from "../store/teamFilterStore";

export function useDebouncedTeamFilters() {
  const name = useTeamFilterStore((s) => s.name);
  const departmentId = useTeamFilterStore((s) => s.departmentId);

  return { name: useDebouncedValue(name), departmentId };
}
