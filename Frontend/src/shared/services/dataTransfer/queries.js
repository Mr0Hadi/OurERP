import { useQuery } from "@tanstack/react-query";

import { fetchDataTransferResources } from "./api-v1";
import { dataTransferKeys } from "./queryKeys";

const NO_RESOURCES = [];

/**
 * فهرستِ جدول‌های قابلِ ورود/خروج با دسترسیِ کاربرِ فعلی. کم‌تغییر است؛ همه‌ی
 * نوارابزارهای صفحه از یک کش می‌خوانند.
 */
export function useDataTransferResourcesQuery() {
  return useQuery({
    queryKey: dataTransferKeys.resources(),
    queryFn: fetchDataTransferResources,
    staleTime: 5 * 60 * 1000,
  });
}

/** یک جدول از همان فهرست؛ `undefined` تا وقتی نیامده یا تعریف نشده. */
export function useDataTransferResource(resource) {
  const { data = NO_RESOURCES } = useDataTransferResourcesQuery();
  return data.find((item) => item.resource === resource);
}
