// src/features/organization/teams/hooks/useDebouncedTeamFilters.js
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import { useTeamFilterStore } from "../store/teamFilterStore";

export function useDebouncedTeamFilters() {
  const globalSearch = useTeamFilterStore((s) => s.globalSearch);
  const departmentId = useTeamFilterStore((s) => s.departmentId);

  return { globalSearch: useDebouncedValue(globalSearch), departmentId };
}
