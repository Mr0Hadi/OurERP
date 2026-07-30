// src/features/suppliers/services/api-v1.js
import axiosInstance from "@/shared/services/api/axios";

export async function fetchSuppliers({
  page = 1,
  limit = 10,
  search = "",
  minBalance = "",
  maxBalance = "",
  balanceType = "",
  sortBy = "companyName",
  sortOrder = "asc",
} = {}) {
  const { data } = await axiosInstance.get("/suppliers", {
    params: {
      page,
      limit,
      search: search || undefined,
      minBalance: minBalance !== "" ? minBalance : undefined,
      maxBalance: maxBalance !== "" ? maxBalance : undefined,
      balanceType: balanceType || undefined,
      sortBy,
      sortOrder,
    },
  });
  return data;
}

export async function createSupplier(supplierData) {
  const { data } = await axiosInstance.post("/suppliers", supplierData);
  return data;
}

export const getSupplierById = async (id) => {
  const { data } = await axiosInstance.get(`/suppliers/${id}`);
  return data;
};

export const updateSupplier = async (id, updatedData) => {
  const { data } = await axiosInstance.put(`/suppliers/${id}`, updatedData);
  return data;
};

export const deleteSupplier = async (id) => {
  await axiosInstance.delete(`/suppliers/${id}`);
  return { success: true, id };
};
