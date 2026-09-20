import { useQuery, keepPreviousData } from "@tanstack/react-query";

import { getDepartmentList, getDepartmentDetail } from "./api-v1";
import { departmentKeys } from "./queryKeys";

const OPTIONS_TAKE = 200;

/**
 * فهرستِ واحدها — `GetDepartmentList`.
 *
 * `params` همان پارامترهای سرور است (`page`, `take`, `name`, `headName`)
 * و پاسخ هم همان `{ departmentList, page }`. این endpoint مرتب‌سازی
 * نمی‌گیرد.
 */
export function useDepartmentListQuery(params) {
  return useQuery({
    queryKey: departmentKeys.list(params),
    queryFn: () => getDepartmentList(params),
    placeholderData: keepPreviousData,
  });
}

export function useDepartmentDetailQuery(id) {
  return useQuery({
    queryKey: departmentKeys.detail(id),
    queryFn: () => getDepartmentDetail(id),
    enabled: !!id,
  });
}

/**
 * فهرست واحدها برای پر کردن Select ها.
 *
 * `GetDepartmentList` خودش فقط واحدهای فعال را برمی‌گرداند
 * (`Where(x => x.IsActive)`)، پس فیلترِ دیگری لازم نیست و فهرستِ خالی
 * یعنی واقعاً واحدی تعریف نشده.
 */
export function useDepartmentOptionsQuery() {
  const query = useQuery({
    queryKey: departmentKeys.options(),
    queryFn: () => getDepartmentList({ page: 1, take: OPTIONS_TAKE }),
  });

  return { ...query, departments: query.data?.departmentList ?? [] };
}
