// src/features/purchases/services/api-v1.js
import axiosInstance from "@/shared/services/api/axios";
import { PURCHASE_STATUSES } from "./constants";

export { PURCHASE_STATUSES, PURCHASE_STATUS_LABELS, PAYMENT_TYPES, PAYMENT_TYPE_LABELS } from "./constants";

export async function fetchPurchases(params = {}) {
  const { data } = await axiosInstance.get("/purchases", {
    params: {
      page: params.page,
      limit: params.limit,
      search: params.search || undefined,
      supplierIds: params.supplierIds?.length ? params.supplierIds : undefined,
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

export async function fetchPurchaseById(id) {
  const { data } = await axiosInstance.get(`/purchases/${id}`);
  return data;
}

export async function createPurchase(purchaseData) {
  const { data } = await axiosInstance.post("/purchases", purchaseData);
  return data;
}

export async function updatePurchase(id, updates) {
  const { data } = await axiosInstance.put(`/purchases/${id}`, updates);
  return data;
}

export async function updatePurchaseStatus(id, status) {
  const { data } = await axiosInstance.patch(`/purchases/${id}/status`, { status });
  return data;
}

export async function updatePurchasePayment(id, paymentData) {
  const { data } = await axiosInstance.post(`/purchases/${id}/payments`, paymentData);
  return data;
}

export async function removePurchase(id) {
  const { data } = await axiosInstance.delete(`/purchases/${id}`);
  return data;
}

export async function deletePurchase(id) {
  return updatePurchaseStatus(id, PURCHASE_STATUSES.CANCELLED);
}
