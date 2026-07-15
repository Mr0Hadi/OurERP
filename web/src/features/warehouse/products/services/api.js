import { api } from "@/shared/lib/api";

export const fetchProducts = async (params = {}) => {
  const res = await api.get("/api/products", {
    page: params.page || 1,
    page_size: params.limit || 10,
    search: params.search || undefined,
    brand: params.brand || undefined,
    category: params.category || undefined,
    min_price: params.minPrice || undefined,
    max_price: params.maxPrice || undefined,
  });
  return {
    items: res.data || [],
    total: res.meta?.totalCount ?? 0,
    page: res.meta?.page ?? 1,
    totalPages: res.meta?.totalPages ?? 1,
  };
};

export const fetchProductById = async (id) => {
  const res = await api.get(`/api/products/${id}`);
  return res.data;
};

export const createProduct = async (productData) => {
  const res = await api.post("/api/products", {
    code: productData.code || "",
    name: productData.name || "",
    barcode: productData.barcode || "",
    brand: productData.brand || "",
    category: productData.category || "",
    unit: productData.unit || "piece",
    purchasePrice: productData.purchasePrice ?? 0,
    retailPrice: productData.retailPrice ?? 0,
    wholesalePrice: productData.wholesalePrice ?? 0,
    tax: productData.tax ?? 0,
    reorderThreshold: productData.reorderThreshold ?? 0,
    imageUrl: productData.imageUrl || "",
  });
  return res.data;
};

export const updateProduct = async (id, productData) => {
  const res = await api.put(`/api/products/${id}`, {
    code: productData.code || "",
    name: productData.name || "",
    barcode: productData.barcode || "",
    brand: productData.brand || "",
    category: productData.category || "",
    unit: productData.unit || "piece",
    purchasePrice: productData.purchasePrice ?? 0,
    retailPrice: productData.retailPrice ?? 0,
    wholesalePrice: productData.wholesalePrice ?? 0,
    tax: productData.tax ?? 0,
    reorderThreshold: productData.reorderThreshold ?? 0,
    imageUrl: productData.imageUrl || "",
  });
  return res.data;
};

export const deleteProduct = async (id) => {
  await api.delete(`/api/products/${id}`);
  return { success: true, id };
};
