// src/features/organization/teams/services/queries.js
import { useQuery, keepPreviousData } from "@tanstack/react-query";

import { fetchTeams, fetchTeamById } from "./api-mockData";
import { teamKeys } from "./queryKeys";

export function useTeamsQuery(filters, pagination, sorting) {
  const queryParams = {
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    search: filters.globalSearch || "",
    departmentId: filters.departmentId ?? "",
    sortBy: sorting?.id ?? "name",
    sortOrder: sorting ? (sorting.desc ? "desc" : "asc") : "asc",
  };

  return useQuery({
    queryKey: teamKeys.list(queryParams),
    queryFn: () => fetchTeams(queryParams),
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 5,
  });
}

export function useTeamQuery(id) {
  return useQuery({
    queryKey: teamKeys.detail(id),
    queryFn: () => fetchTeamById(id),
    enabled: !!id,
  });
}
