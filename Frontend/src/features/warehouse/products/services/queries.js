import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { keepPreviousData } from "@tanstack/react-query";
import { listQuery } from "@/shared/services/api/contract";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
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

const OPTIONS_PAGE_SIZE = 200;
/** سقفِ ایمنی؛ بیشتر از این دیگر صفحه‌ی بعد نمی‌گیرد. */
const OPTIONS_MAX_PAGES = 1000;
const OPTIONS_SORTING = { id: "name", desc: false };
const NO_PRODUCTS = [];

async function fetchAllProductOptions() {
  const items = [];
  for (let page = 0; page < OPTIONS_MAX_PAGES; page += 1) {
    const params = listQuery({
      filters: {},
      pagination: { pageIndex: page, pageSize: OPTIONS_PAGE_SIZE },
      sorting: OPTIONS_SORTING,
      sortColumns: PRODUCT_SORT_COLUMNS,
    });
    const result = await fetchProducts(params);
    items.push(...result.items);
    if (page + 1 >= result.totalPages || result.items.length === 0) break;
  }
  return items;
}

/**
 * فهرستِ همه‌ی کالاها برای فیلترِ کالا در صفحه‌ی دانه‌ها (مرتب بر اساس نام).
 * انتخابگرِ اقلامِ فاکتور از این استفاده نمی‌کند — `useProductSearchQuery`. سرور در هر درخواست حداکثر ۲۰۰ ردیف می‌دهد، پس صفحه‌به‌صفحه
 * خوانده می‌شود تا جست‌وجوی سمتِ کلاینت کلِ کالاها را ببیند.
 *
 * TODO(بکند): با رشد کاتالوگ، جست‌وجوی سمتِ سرور بهتر است (بندِ ۱۳.۵ سندِ
 * frontend-requests.fa.md).
 *
 * `enabled: false` برای انتخابگرِ تاشو: تا باز نشده، چیزی دانلود نمی‌شود.
 */
export function useProductsOptionsQuery({ enabled = true } = {}) {
  const { data, isLoading } = useQuery({
    queryKey: productKeys.options(),
    queryFn: fetchAllProductOptions,
    gcTime: 1000 * 60 * 10,
    staleTime: 30_000,
    enabled,
  });
  return { products: data ?? NO_PRODUCTS, isLoading };
}

// ─── جست‌وجوی کالا (انتخابگرِ اقلام) ───────────────────────────────────────

/** سرور هر درخواست را به همین تعداد نزدیک‌ترین نتیجه محدود می‌کنیم. */
export const PRODUCT_SEARCH_LIMIT = 200;
const SECONDARY_SEARCH_LIMIT = 30;
const HAS_DIGIT = /\d/;

const searchParams = (filters, take) =>
  listQuery({
    filters,
    pagination: { pageIndex: 0, pageSize: take },
    sorting: OPTIONS_SORTING,
    sortColumns: PRODUCT_SORT_COLUMNS,
  });

/**
 * جست‌وجوی سمتِ سرور: فیلترهای `Name`، `Code`، `BarCode` و `Brand` در `GetProductList`
 * با «و» ترکیب می‌شوند، پس برای «یا» هر کدام جدا پرسیده و اینجا ادغام می‌شوند.
 * تطبیقِ دقیقِ کد/بارکد اول می‌آید (سرور خودش وقتی کدِ کامل باشد فقط همان را می‌دهد)،
 * بعد نزدیک‌ترین نام‌ها (تا ۲۰۰ ردیف) و بعد برند.
 *
 * TODO(بکند): با پارامترِ واحدِ `Search` (بندِ ۱۳.۵ frontend-requests.fa.md) این چند
 * درخواست یکی می‌شود.
 */
export async function searchProducts(term, categoryId = "") {
  const text = term.trim();
  const category = categoryId ? { productCategoryId: categoryId } : {};
  if (!text) {
    return (await fetchProducts(searchParams(category, PRODUCT_SEARCH_LIMIT))).items;
  }

  const byName = fetchProducts(searchParams({ ...category, name: text }, PRODUCT_SEARCH_LIMIT));
  const byBrand = fetchProducts(searchParams({ ...category, brand: text }, SECONDARY_SEARCH_LIMIT));
  const byCode = HAS_DIGIT.test(text)
    ? fetchProducts(searchParams({ ...category, code: text }, SECONDARY_SEARCH_LIMIT))
    : null;
  const byBarcode = HAS_DIGIT.test(text)
    ? fetchProducts(searchParams({ ...category, barCode: text }, SECONDARY_SEARCH_LIMIT))
    : null;

  const results = await Promise.all([byCode, byBarcode, byName, byBrand].map((p) => p ?? { items: [] }));
  const seen = new Set();
  const merged = [];
  for (const { items } of results) {
    for (const product of items) {
      if (seen.has(product.id)) continue;
      seen.add(product.id);
      merged.push(product);
    }
  }
  return merged;
}

/**
 * نتیجه‌ی جست‌وجو برای انتخابگر. `enabled: false` تا وقتی که نه متنی نوشته شده نه دسته‌ای
 * انتخاب شده نه «همه‌ی کالاها» زده شده؛ تایپ با تأخیر به سرور می‌رود.
 */
export function useProductSearchQuery(term, categoryId, { enabled = true } = {}) {
  const debounced = useDebouncedValue(term.trim());
  const { data, isFetching } = useQuery({
    queryKey: productKeys.search(debounced, categoryId),
    queryFn: () => searchProducts(debounced, categoryId),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    enabled,
  });
  return {
    products: data ?? NO_PRODUCTS,
    isSearching: enabled && (isFetching || debounced !== term.trim()),
  };
}

/** همان جست‌وجو بی‌تأخیر، با کش — برای Enter پیش از رسیدنِ نتیجه‌ی تأخیری. */
export function useProductSearchLoader() {
  const queryClient = useQueryClient();
  return (term, categoryId = "") =>
    queryClient.fetchQuery({
      queryKey: productKeys.search(term.trim(), categoryId),
      queryFn: () => searchProducts(term, categoryId),
      staleTime: 30_000,
    });
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
