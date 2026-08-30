// src\features\warehouse\products\services\api-v1.js

// src/features/warehouse/products/services/api-v1.js
import axiosInstance from "@/shared/services/api/axios";

export const fetchProducts = async (params) => {
  const { data } = await axiosInstance.get("/products", {
    params: {
      ...params,
      search: params.search || undefined,
      brand: params.brand || undefined,
      productCategoryId: params.productCategoryId || undefined,
      minPrice: params.minPrice || undefined,
      maxPrice: params.maxPrice || undefined,
      stockStatus: params.stockStatus || undefined,
    },
  });
  return data;
};

export const fetchProductById = async (id) => {
  const { data } = await axiosInstance.get(`/products/${id}`);
  return data;
};

/**
 * جست‌وجوی دقیق با بارکد یا کد کالا — برای اسکن.
 *
 * `GET api/Product/ScanBarcode` همان endpointِ اختصاصیِ اسکنر است: هم
 * کدِ کالا را می‌پذیرد هم بارکدِ یک دانه (با یا بدونِ خط‌تیره) و کالای
 * متناظر را برمی‌گرداند. جست‌وجوی متنی جای این را نمی‌گیرد، چون روی
 * `code` تطبیقِ دقیق نمی‌دهد.
 *
 * کدِ نامعتبر ۴۰۴ می‌گیرد؛ اینجا به `null` ترجمه می‌شود تا فراخوان بین
 * «پیدا نشد» و «خطای شبکه» فرق بگذارد.
 */
export const fetchProductByBarcode = async (code) => {
  try {
    const { data } = await axiosInstance.get("/Product/ScanBarcode", {
      params: { code },
    });
    return data?.product ?? null;
  } catch (error) {
    if (error?.response?.status === 404) return null;
    throw error;
  }
};

/**
 * `code`/`barCode` عمداً در پیلود نیستند — بکند خودش می‌سازدشان و
 * `CreateProductCommand` اصلاً این دو فیلد را ندارد (بخش ۷ سند
 * api-guide.fa.md). خروجی `{ id, code, barCode }` است.
 */
export const createProduct = async (productData) => {
  const { data } = await axiosInstance.post("/products", productData);
  return data;
};

export const updateProduct = async (id, productData) => {
  const { data } = await axiosInstance.put(`/products/${id}`, productData);
  return data;
};

export const deleteProduct = async (id) => {
  await axiosInstance.delete(`/products/${id}`);
  return { success: true, id };
};
