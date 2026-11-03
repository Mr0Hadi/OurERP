import axiosInstance from "@/shared/services/api/axios";
import { normalizeListResponse } from "@/shared/services/api/contract";

/** `GET api/ProductCategory/GetProductCategoryList` */
export const fetchProductCategories = async (params = {}) => {
  const { data } = await axiosInstance.get(
    "/ProductCategory/GetProductCategoryList",
    { params: { page: params.page ?? 1, take: params.limit ?? 100, name: params.name || undefined } },
  );

  return normalizeListResponse(data, { itemsKey: "productCategoryList" });
};

/**
 * کالاهای یک دسته — `GetProductList` با `ProductCategoryId`؛ بدونِ دسته یعنی همه‌ی کالاها.
 * هر کالا فقط یک دسته دارد، پس برخلافِ خودروها فهرستِ دسته‌ها روی کالا نمی‌آید.
 */
export const fetchCategoryProducts = async ({ categoryId, search, page = 1, take = 20 }) => {
  const { data } = await axiosInstance.get("/Product/GetProductList", {
    params: {
      ProductCategoryId: categoryId ?? undefined,
      Name: search || undefined,
      Page: page,
      Take: take,
    },
  });
  return normalizeListResponse(data, { itemsKey: "productList" });
};

/**
 * `POST api/ProductCategory/CreateProductCategory` — بدنه فقط `name`؛ پاسخ `{ id, name }`
 * تا فرمِ کالا دسته‌ی تازه را خودکار انتخاب کند (۲۰۲۶-۱۰-۳۰، بندِ ۱۵.۴).
 */
export const createProductCategory = async ({ name }) => {
  const { data } = await axiosInstance.post("/ProductCategory/CreateProductCategory", { name });
  return data;
};

/** `PUT api/ProductCategory/UpdateProductCategory` — `id` در بدنه است، نه در مسیر. */
export const updateProductCategory = async (id, { name }) => {
  const { data } = await axiosInstance.put(
    "/ProductCategory/UpdateProductCategory",
    { id, name },
  );
  return data;
};

/**
 * `DELETE api/ProductCategory/DeleteProductCategory` — حذف نرم (سرور
 * فقط `IsActive` را خاموش می‌کند)؛ کالاهای همان دسته دست‌نخورده
 * می‌مانند، فقط دیگر در فهرست دسته‌بندی‌ها دیده نمی‌شود.
 */
export const deleteProductCategory = async (id) => {
  await axiosInstance.delete("/ProductCategory/DeleteProductCategory", {
    params: { id },
  });
  return { success: true, id };
};
