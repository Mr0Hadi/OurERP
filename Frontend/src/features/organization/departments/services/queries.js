// src/features/organization/departments/services/queries.js
import { useQuery, keepPreviousData } from "@tanstack/react-query";

import { DEPARTMENT_FALLBACK } from "@/shared/domain/enums/department";
import { fetchDepartments, fetchDepartmentById } from "./api-v1";
import { departmentKeys } from "./queryKeys";

const OPTIONS_PAGE_SIZE = 200;

export function useDepartmentsQuery(filters, pagination, sorting) {
  const queryParams = {
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    search: filters.globalSearch || "",
    sortBy: sorting?.id ?? "name",
    sortOrder: sorting ? (sorting.desc ? "desc" : "asc") : "asc",
  };

  return useQuery({
    queryKey: departmentKeys.list(queryParams),
    queryFn: () => fetchDepartments(queryParams),
    placeholderData: keepPreviousData,
  });
}

export function useDepartmentQuery(id) {
  return useQuery({
    queryKey: departmentKeys.detail(id),
    queryFn: () => fetchDepartmentById(id),
    enabled: !!id,
  });
}

/**
 * فهرست واحدها برای پر کردن Select ها.
 *
 * تا وقتی بکند ردیف‌های `Department` را سید نکرده، پاسخِ خالی یعنی
 * انتخابگرِ خالی و کاربر گیر می‌کند. پس `DEPARTMENT_FALLBACK` (همان
 * enum عددی) جای خالی را پر می‌کند. داده‌ی سرور همیشه برنده است؛
 * fallback فقط وقتی می‌آید که سرور چیزی نداشته باشد.
 */
export function useDepartmentOptionsQuery() {
  const query = useQuery({
    queryKey: departmentKeys.options(),
    queryFn: () => fetchDepartments({ page: 1, limit: OPTIONS_PAGE_SIZE }),
  });

  const items = query.data?.items ?? [];
  const source = items.length > 0 ? items : DEPARTMENT_FALLBACK;

  return {
    ...query,
    departments: source.filter((d) => d.isActive !== false),
    isFallback: items.length === 0 && !query.isLoading,
  };
}
