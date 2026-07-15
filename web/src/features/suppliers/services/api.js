import { api } from "@/shared/lib/api";

export async function fetchSuppliers({
  page = 1,
  limit = 10,
  search = "",
  sortBy = "companyName",
  sortOrder = "asc",
} = {}) {
  const res = await api.get("/api/suppliers", {
    page,
    page_size: limit,
    search: search || undefined,
  });
  return {
    items: res.data || [],
    total: res.meta?.totalCount ?? 0,
    page: res.meta?.page ?? 1,
    totalPages: res.meta?.totalPages ?? 1,
  };
}

export async function createSupplier(supplierData) {
  const res = await api.post("/api/suppliers", {
    companyName: supplierData.companyName || "",
    firstName: supplierData.firstName || "",
    lastName: supplierData.lastName || "",
    phone: supplierData.phone || "",
    email: supplierData.email || "",
    address: supplierData.address || "",
    postalCode: supplierData.postalCode || "",
    notes: supplierData.notes || "",
    balance: supplierData.balance || 0,
    balanceType: supplierData.balanceType || "none",
    coordinates: supplierData.coordinates || null,
  });
  return res.data;
}

export const getSupplierById = async (id) => {
  const res = await api.get(`/api/suppliers/${id}`);
  return res.data;
};

export const updateSupplier = async (id, updatedData) => {
  const res = await api.put(`/api/suppliers/${id}`, {
    companyName: updatedData.companyName || "",
    firstName: updatedData.firstName || "",
    lastName: updatedData.lastName || "",
    phone: updatedData.phone || "",
    email: updatedData.email || "",
    address: updatedData.address || "",
    postalCode: updatedData.postalCode || "",
    notes: updatedData.notes || "",
    balance: updatedData.balance || 0,
    balanceType: updatedData.balanceType || "none",
    coordinates: updatedData.coordinates || null,
  });
  return res.data;
};

export const deleteSupplier = async (id) => {
  await api.delete(`/api/suppliers/${id}`);
  return { success: true, id };
};
