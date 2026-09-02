// src\features\warehouse\products\services\api-v1.js

// src/features/warehouse/products/services/api-v1.js
import axiosInstance from "@/shared/services/api/axios";
import { normalizeListResponse } from "@/shared/services/api/contract";

/**
 * لایه‌ی تماس با `api/Product` (بخش ۷ سند api-guide.fa.md).
 *
 * مسیرها اکشن‌محورند (`GetProductList`، نه `GET /products`) — دقیقاً
 * مثل بقیه‌ی کنترلرهای بکند (`Supplier`، `Customer`، ...)، نه REST
 * عمومی. `Id` روی آپدیت/حذف هم مثل بقیه‌ی فیچرها است: آپدیت در بدنه،
 * حذف در query.
 */

/**
 * `IsLowOnStock` تنها فیلترِ موجودیِ سرور است (bool). سه‌گزینه‌ایِ
 * فرانت (`inStock`/`lowStock`/`outOfStock`) روی همین یک بولین سوار
 * می‌شود؛ فقط `lowStock` مستقیم نگاشت دارد. `outOfStock` معادلِ
 * سرور ندارد و نادیده گرفته می‌شود (سرور خطا نمی‌دهد، فقط فیلتر
 * نمی‌کند) — تا endpoint اختصاصی اضافه نشود همینه.
 */
function toIsLowOnStock(stockStatus) {
  if (stockStatus === "lowStock") return true;
  if (stockStatus === "inStock") return false;
  return undefined;
}

export const fetchProducts = async (params = {}) => {
  const { data } = await axiosInstance.get("/Product/GetProductList", {
    params: {
      page: params.page,
      take: params.limit,
      name: params.search || undefined,
      brand: params.brand || undefined,
      productCategoryId: params.productCategoryId || undefined,
      isLowOnStock: toIsLowOnStock(params.stockStatus),
      fromPrice: params.minPrice || undefined,
      toPrice: params.maxPrice || undefined,
      // سرور مرتب‌سازی ندارد — اگر فرستاده شود بی‌صدا نادیده گرفته می‌شود.
    },
  });

  return normalizeListResponse(data, { itemsKey: "productList" });
};

export const fetchProductById = async (id) => {
  const { data } = await axiosInstance.get("/Product/GetProductDetail", {
    params: { id },
  });
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
 *
 * پیلود همان چیزی است که `useProductForm.buildProductPayload` می‌سازد —
 * از قبل دقیقاً شکلِ `CreateProductCommand`/`UpdateProductCommand` است
 * (`imageObjectKey`، `wholeSalePrice` با همین حروف)، پس اینجا دوباره
 * فیلد به فیلد بازسازی نمی‌شود.
 */
export const createProduct = async (productData) => {
  const { data } = await axiosInstance.post("/Product/CreateProduct", productData);
  return data;
};

/** `PUT api/Product/UpdateProduct` — برخلافِ REST، `id` در بدنه است نه در URL. */
export const updateProduct = async (id, productData) => {
  const { data } = await axiosInstance.put("/Product/UpdateProduct", {
    ...productData,
    id,
  });
  return data;
};

/** `DELETE api/Product/DeleteProduct` — `id` به‌صورت query است نه بخشی از مسیر. */
export const deleteProduct = async (id) => {
  await axiosInstance.delete("/Product/DeleteProduct", { params: { id } });
  return { success: true, id };
};
