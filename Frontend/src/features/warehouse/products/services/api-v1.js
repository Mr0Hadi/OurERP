// src\features\warehouse\products\services\api-v1.js

// src/features/warehouse/products/services/api-v1.js
import axiosInstance from "@/shared/services/api/axios";

export const fetchProducts = async (params) => {
  const { data } = await axiosInstance.get("/products", {
    params: {
      ...params,
      search: params.search || undefined,
      brand: params.brand || undefined,
      category: params.category || undefined,
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
