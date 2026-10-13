import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { fetchCategoryProducts, fetchProductCategories } from "./api-v1";
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

/** کالاهای یک دسته؛ `categoryId` تهی یعنی همه‌ی کالاها. */
export function useCategoryProductsQuery({ categoryId, search, page, take }) {
  return useQuery({
    queryKey: productCategoryKeys.productList({ categoryId, search, page, take }),
    queryFn: () => fetchCategoryProducts({ categoryId, search, page, take }),
    placeholderData: keepPreviousData,
  });
}
