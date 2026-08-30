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
