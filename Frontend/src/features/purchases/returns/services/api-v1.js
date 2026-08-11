import axiosInstance from "@/shared/services/api/axios";

export async function fetchShortageReports(params = {}) {
  const { data } = await axiosInstance.get("/purchases/shortage-reports", { params });
  return data;
}
export async function fetchShortageReportByPurchaseId(purchaseId) {
  const { data } = await axiosInstance.get(`/purchases/shortage-reports/${purchaseId}`);
  return data;
}
export async function fetchPurchaseReturns(params = {}) {
  const { data } = await axiosInstance.get("/purchase-returns", { params });
  return data;
}
export async function fetchPurchaseReturnById(id) {
  const { data } = await axiosInstance.get(`/purchase-returns/${id}`);
  return data;
}
export async function createPurchaseReturn(payload) {
  const { data } = await axiosInstance.post("/purchase-returns", payload);
  return data;
}
export async function updatePurchaseReturn(id, updates) {
  const { data } = await axiosInstance.put(`/purchase-returns/${id}`, updates);
  return data;
}
export async function updatePurchaseReturnStatus(id, statusData) {
  const { data } = await axiosInstance.patch(
    `/purchase-returns/${id}/status`,
    statusData,
  );
  return data;
}
export async function removePurchaseReturn(id) {
  const { data } = await axiosInstance.delete(`/purchase-returns/${id}`);
  return data;
}