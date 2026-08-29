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
 * فهرست تیم‌ها برای پر کردن Select ها و کارت‌های داخلِ صفحه‌ی جزئیات.
 *
 * `departmentId` اختیاری است: فرم کارمند فقط تیم‌های واحدِ انتخاب‌شده را
 * می‌خواهد (تیمی که زیر واحد دیگری است، انتخابِ نامعتبری است)، ولی
 * انتخابگرِ «افزودن تیم موجود» در صفحه‌ی واحد، همه‌ی تیم‌ها را لازم دارد.
 *
 * برخلاف واحدها اینجا fallback ای در کار نیست — تیم هیچ enum ای ندارد و
 * فهرست خالی یعنی واقعاً تیمی تعریف نشده.
 */
export function useTeamOptionsQuery(departmentId = "") {
  const query = useQuery({
    queryKey: teamKeys.options(departmentId),
    queryFn: () =>
      fetchTeams({
        page: 1,
        limit: OPTIONS_PAGE_SIZE,
        departmentId: departmentId ?? "",
        sortBy: "name",
        sortOrder: "asc",
      }),
    staleTime: 1000 * 60 * 5,
  });

  const teams = (query.data?.items ?? []).filter((t) => t.isActive !== false);

  return { ...query, teams };
}
