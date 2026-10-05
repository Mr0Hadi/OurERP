import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { keepPreviousData } from "@tanstack/react-query";
import { listQuery } from "@/shared/services/api/contract";
import { useDebouncedFilters } from "@/shared/hooks/useDebouncedFilters";

import {
  PRODUCT_SORT_COLUMNS,
  fetchProducts,
  fetchProductById,
} from "./api-v1";
import { useProductFilterStore } from "../store/productFilterStore";
import { productKeys } from "./queryKeys";

/** فیلترهای فعلیِ لیستِ کالا؛ نام، برند و قیمت با تأخیر. */
export function useProductListFilters() {
  return useDebouncedFilters(useProductFilterStore, {
    text: ["name", "brand", "fromPrice", "toPrice"],
    instant: ["productCategoryId", "isLowOnStock", "isIncomplete"],
  });
}

export function useProductsQuery(filters, pagination, sorting, { enabled = true } = {}) {
  const params = listQuery({ filters, pagination, sorting, sortColumns: PRODUCT_SORT_COLUMNS });
  return useQuery({
    queryKey: productKeys.list(params),
    queryFn: () => fetchProducts(params),
    placeholderData: keepPreviousData,
    gcTime: 1000 * 60 * 10,
    enabled,
  });
}

/**
 * جزئیاتِ کامل یک کالا، از کش یا سرور — برای افزودنِ قلم به فاکتور.
 *
 * `GetProductList` قیمتِ خرید، واحد و نرخِ مالیات را ندارد (سندِ frontend-requests.fa.md،
 * بندِ ۹.۳)؛ بدونِ این، قلمِ خرید با قیمتِ صفر و جمعِ بی‌مالیات اضافه می‌شد.
 */
export function useProductDetailLoader() {
  const queryClient = useQueryClient();
  return (id) =>
    queryClient.ensureQueryData({
      queryKey: productKeys.detail(id),
      queryFn: () => fetchProductById(id),
      staleTime: 60_000,
    });
}

export function useProductQuery(id) {
  return useQuery({
    queryKey: productKeys.detail(id),
    queryFn: () => fetchProductById(id),
    enabled: !!id,
  });
}

// ─── گزینه‌های انتخاب ───────────────────────────────────────────────────────

const OPTIONS_PAGINATION = { pageIndex: 0, pageSize: 200 };
const OPTIONS_SORTING = { id: "name", desc: false };
const NO_FILTERS = {};
const NO_PRODUCTS = [];

/**
 * فهرستِ کالاها برای انتخابگرها و نگاشتِ شناسه به کالا در فرم‌ها
 * (حداکثر ۲۰۰ ردیف، مرتب بر اساس نام).
 *
 * TODO(بکند): با بیش از ۲۰۰ کالا، بقیه در فرمِ خرید/فروش پیدا نمی‌شوند؛ جست‌وجوی سمتِ
 * سرور لازم است (بندِ ۱۳.۵ سندِ frontend-requests.fa.md).
 *
 * `enabled: false` برای انتخابگرِ تاشو: تا باز نشده، ۲۰۰ ردیف دانلود نمی‌شود.
 */
export function useProductsOptionsQuery({ enabled = true } = {}) {
  const { data, isLoading } = useProductsQuery(NO_FILTERS, OPTIONS_PAGINATION, OPTIONS_SORTING, { enabled });
  return { products: data?.items ?? NO_PRODUCTS, isLoading };
}

// ─── کالاهای یک سند ─────────────────────────────────────────────────────────

const NO_PRODUCT_MAP = new Map();

/**
 * جزئیاتِ کالاهای یک سند (تصویر، برند، `requiresUnitTracking`) — فقط همان
 * کالاهایی که در سند هستند، هر کدام با کشِ جزئیاتِ خودش.
 *
 * جای `useProductsOptionsQuery` در صفحه‌های انبار: آن فهرست ۲۰۰ کالای اول را
 * می‌گرفت، پس برای کالای ۲۰۱ام «ردیابی‌پذیر» بودن معلوم نمی‌شد — فرمِ ارسال
 * اسکنِ دانه را نمی‌خواست و سرور هنگامِ ثبت رد می‌کرد.
 *
 * TODO(بکند): با `requiresUnitTracking` و تصویر روی اقلامِ خودِ سند (بندِ ۱۵.۱)
 * این درخواست‌ها لازم نیستند.
 *
 * @returns `{ productMap: Map<id, ProductDto>, isLoading }`
 */
export function useDocumentProducts(productIds) {
  const ids = [...new Set(productIds.filter((id) => id != null).map(Number))].sort((a, b) => a - b);
  return useQueries({
    queries: ids.map((id) => ({
      queryKey: productKeys.detail(id),
      queryFn: () => fetchProductById(id),
      staleTime: 60_000,
    })),
    combine: (results) => {
      if (results.length === 0) return { productMap: NO_PRODUCT_MAP, isLoading: false };
      const productMap = new Map();
      results.forEach((result, index) => {
        if (result.data) productMap.set(ids[index], result.data);
      });
      return { productMap, isLoading: results.some((result) => result.isLoading) };
    },
  });
}
