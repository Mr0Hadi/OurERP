// src/features/warehouse/categories/services/queries.js
import { useQuery } from "@tanstack/react-query";

import { fetchProductCategories } from "./api-v1";
import { productCategoryKeys } from "./queryKeys";

/**
 * فهرست دسته‌بندی‌ها — هم برای انتخابگرها هم برای صفحه‌ی مدیریت.
 * دسته‌بندی کم و کم‌تغییر است، پس یک‌بار گرفته می‌شود (`limit: 100`،
 * بدون صفحه‌بندی سمتِ سرور).
 *
 * `search` روی `name` سرور فیلتر می‌کند؛ انتخابگرها بدونِ آرگومان
 * صدا می‌زنند (فهرستِ کامل).
 */
export function useProductCategoriesQuery(search = "") {
  return useQuery({
    queryKey: productCategoryKeys.list({ search }),
    queryFn: () => fetchProductCategories({ limit: 100, name: search || undefined }),
    select: (data) => data.items ?? [],
  });
}
