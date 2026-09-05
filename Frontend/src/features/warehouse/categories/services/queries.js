// src/features/warehouse/categories/services/queries.js
import { useQuery } from "@tanstack/react-query";

import { fetchProductCategories } from "./api-v1";
import { productCategoryKeys } from "./queryKeys";

/**
 * فهرست دسته‌بندی‌ها برای انتخابگرها. دسته‌بندی کم و کم‌تغییر است، پس
 * یک‌بار گرفته و مدت زیادی تازه نگه داشته می‌شود.
 */
export function useProductCategoriesQuery() {
  return useQuery({
    queryKey: productCategoryKeys.list({}),
    queryFn: () => fetchProductCategories({ limit: 100 }),
    select: (data) => data.items ?? [],
  });
}
