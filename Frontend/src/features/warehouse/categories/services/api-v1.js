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
 * `POST api/ProductCategory/CreateProductCategory` — بدنه فقط `name`.
 *
 * سرور دسته‌ی ساخته‌شده را برنمی‌گرداند (`Data` خالی)، پس فرمِ کالا نمی‌توانست
 * دسته‌ی تازه را خودکار انتخاب کند. تا وقتی `{ id, name }` برگردد (بندِ ۱۵.۴
 * سندِ درخواست‌ها)، دسته با همان نام از فهرست خوانده می‌شود.
 */
export const createProductCategory = async ({ name }) => {
  const { data } = await axiosInstance.post(
    "/ProductCategory/CreateProductCategory",
    { name },
  );
  if (data?.id) return data;
  const { items } = await fetchProductCategories({ name, limit: 100 });
  // اگر چند دسته هم‌نام باشند، تازه‌ترین (بزرگ‌ترین شناسه).
  const [created] = items
    .filter((category) => category.name === name)
    .sort((a, b) => b.id - a.id);
  return created ?? null;
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
