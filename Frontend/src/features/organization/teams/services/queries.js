// src/features/organization/teams/services/queries.js
import { useQuery, keepPreviousData } from "@tanstack/react-query";

import { fetchTeams, fetchTeamById } from "./api-mockData";
import { teamKeys } from "./queryKeys";

const OPTIONS_PAGE_SIZE = 200;

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

/**
 * تیم‌های یک واحد، برای Select زنجیره‌ای «واحد → تیم».
 *
 * بدون `departmentId` غیرفعال می‌ماند: نمایش تیم‌های همه‌ی واحدها در
 * فرمی که واحدش انتخاب شده، فقط راه را برای انتخاب ترکیب نامعتبر
 * (تیمِ واحد فروش برای کارمندِ واحد انبار) باز می‌کند.
 */
export function useTeamOptionsQuery(departmentId) {
  const enabled = departmentId !== "" && departmentId != null;

  const query = useQuery({
    queryKey: teamKeys.options(departmentId),
    queryFn: () =>
      fetchTeams({ page: 1, limit: OPTIONS_PAGE_SIZE, departmentId }),
    enabled,
    staleTime: 1000 * 60 * 10,
  });

  return {
    ...query,
    teams: (query.data?.items ?? []).filter((t) => t.isActive !== false),
  };
}

/**
 * همه‌ی تیم‌ها، بدون قید واحد.
 *
 * برخلاف `useTeamOptionsQuery` این یکی برای *نمایش* است نه انتخاب: جدول
 * کارمندان باید تیمِ هر ردیف را — از هر واحدی که باشد — پیدا کند.
 */
export function useAllTeamsQuery() {
  const query = useQuery({
    queryKey: teamKeys.options("all"),
    queryFn: () => fetchTeams({ page: 1, limit: OPTIONS_PAGE_SIZE }),
    staleTime: 1000 * 60 * 10,
  });

  return { ...query, teams: query.data?.items ?? [] };
}
