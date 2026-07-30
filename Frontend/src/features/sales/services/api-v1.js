// src\features\sales\services\api-v1.js

// src/features/sales/services/api-v1.js
import axiosInstance from "@/shared/services/api/axios";

export async function fetchSales(params = {}) {
  const { data } = await axiosInstance.get("/sales", {
    params: {
      page: params.page,
      limit: params.limit,
      search: params.search || undefined,
      customerIds: params.customerIds?.length ? params.customerIds : undefined,
      status: params.status || undefined,
      paymentType: params.paymentType || undefined,
      fromDate: params.fromDate || undefined,
      toDate: params.toDate || undefined,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
    },
  });
  return data;
}

export async function fetchSaleById(id) {
  const { data } = await axiosInstance.get(`/sales/${id}`);
  return data;
}

export async function createSale(saleData) {
  const { data } = await axiosInstance.post("/sales", saleData);
  return data;
}

export async function updateSale(id, updates) {
  const { data } = await axiosInstance.put(`/sales/${id}`, updates);
  return data;
}

export async function updateSaleStatus(id, status) {
  const { data } = await axiosInstance.patch(`/sales/${id}/status`, { status });
  return data;
}

export async function updateSalePayment(id, paymentData) {
  const { data } = await axiosInstance.post(`/sales/${id}/payments`, paymentData);
  return data;
}

export async function removeSale(id) {
  const { data } = await axiosInstance.delete(`/sales/${id}`);
  return data;
}

export async function deleteSale(id) {
  return updateSaleStatus(id, "cancelled");
}
