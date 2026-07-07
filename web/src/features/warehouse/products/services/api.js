import { api } from "@/shared/lib/api";

function mapProduct(p) {
  return {
    id: String(p.id),
    code: p.internal_code || "",
    barcode: p.barcode || "",
    name: p.name || "",
    brand: p.brand || "",
    category: p.category || "",
    unit: p.unit || "piece",
    purchasePrice: p.cost_price ?? 0,
    retailPrice: p.sale_price_retail ?? 0,
    wholesalePrice: p.sale_price_wholesale ?? 0,
    tax: p.tax ?? 0,
    stock: p.current_stock ?? p.stock ?? 0,
    description: "",
    imageUrl: p.image_url || "",
    isActive: p.is_active ?? true,
    reorderPoint: p.reorder_threshold ?? 0,
  };
}

function mapProductForCreate(data) {
  const result = {
    internal_code: data.code || "",
    name: data.name || "",
    barcode: data.barcode || "",
    brand: data.brand || "",
    category: data.category || "",
    unit: data.unit || "piece",
    cost_price: data.purchasePrice ?? 0,
    sale_price_retail: data.retailPrice ?? 0,
    sale_price_wholesale: data.wholesalePrice ?? 0,
    tax: data.tax ?? 0,
    reorder_threshold: data.reorderPoint ?? 0,
    image_url: data.imageUrl || "",
  };
  Object.keys(result).forEach((k) => {
    if (result[k] === "" || result[k] === undefined || result[k] === null) delete result[k];
  });
  return result;
}

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
    items: (res.data || []).map(mapProduct),
    total: res.meta?.total_count ?? 0,
    page: res.meta?.page ?? 1,
    totalPages: res.meta?.total_pages ?? 1,
  };
};

export const fetchProductById = async (id) => {
  const res = await api.get(`/api/products/${id}`);
  return mapProduct(res.data);
};

export const createProduct = async (productData) => {
  const res = await api.post("/api/products", mapProductForCreate(productData));
  return mapProduct(res.data);
};

export const updateProduct = async (id, productData) => {
  const res = await api.put(`/api/products/${id}`, mapProductForCreate(productData));
  return mapProduct(res.data);
};

export const deleteProduct = async (id) => {
  await api.delete(`/api/products/${id}`);
  return { success: true, id };
};
