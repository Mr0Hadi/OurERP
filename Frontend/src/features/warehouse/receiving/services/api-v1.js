// src/features/warehouse/receiving/services/api-v1.js
import axiosInstance from "@/shared/services/api/axios";

export { RECEIVING_ELIGIBLE_STATUSES, RECEIVING_STATUS_LABELS } from "./constants";

export async function fetchReceivingPurchases(params = {}) {
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
      receivingEligible: true,
    },
  });
  return data;
}

export async function fetchReceivingPurchaseById(id) {
  const { data } = await axiosInstance.get(`/purchases/${id}`);
  return data;
}

export async function updateReceivingStatus(id, receivedItems) {
  const { data } = await axiosInstance.patch(`/purchases/${id}/receiving`, {
    receivedItems,
  });
  return data;
}

export async function confirmReceiving(purchaseId, receivingData) {
  const { data } = await axiosInstance.post(
    `/purchases/${purchaseId}/receiving/confirm`,
    receivingData
  );
  return data;
}
