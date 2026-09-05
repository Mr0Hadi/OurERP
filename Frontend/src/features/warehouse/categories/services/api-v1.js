// src/features/warehouse/categories/services/api-v1.js
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

/** `POST api/ProductCategory/CreateProductCategory` — بدنه فقط `name`. */
export const createProductCategory = async ({ name }) => {
  const { data } = await axiosInstance.post(
    "/ProductCategory/CreateProductCategory",
    { name },
  );
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
