// src/features/employees/services/queries.js
import { useQuery, keepPreviousData } from "@tanstack/react-query";

import { fetchEmployees, fetchEmployeeById } from "./api-mockData";
import { employeeKeys } from "./queryKeys";

export function useEmployeesQuery(filters, pagination, sorting) {
  const queryParams = {
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    search: filters.globalSearch || "",
    roleId: filters.roleId ?? "",
    isActive: filters.isActive ?? "",
    sortBy: sorting?.id ?? "createdAt",
    sortOrder: sorting ? (sorting.desc ? "desc" : "asc") : "desc",
  };

  return useQuery({
    queryKey: employeeKeys.list(queryParams),
    queryFn: () => fetchEmployees(queryParams),
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 3,
  });
}

export function useEmployeeQuery(id) {
  return useQuery({
    queryKey: employeeKeys.detail(id),
    queryFn: () => fetchEmployeeById(id),
    enabled: !!id,
  });
}
