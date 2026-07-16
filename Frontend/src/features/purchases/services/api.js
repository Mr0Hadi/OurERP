import { api } from "@/shared/services/api/api";
import { PURCHASE_STATUSES, PURCHASE_STATUS_LABELS, PAYMENT_TYPES, PAYMENT_TYPE_LABELS } from "./constants";

export { PURCHASE_STATUSES, PURCHASE_STATUS_LABELS, PAYMENT_TYPES, PAYMENT_TYPE_LABELS };

export async function createPurchase(purchaseData) {
  const res = await api.post("/api/purchase-orders", {
    supplierId: parseInt(purchaseData.supplierId, 10) || 0,
    items: (purchaseData.items || []).map((i) => ({
      productId: parseInt(i.productId, 10) || 0,
      qty: Number(i.qty ?? i.orderedQty ?? 0) || 0,
      unitPrice: Number(i.unitPrice ?? 0) || 0,
      discount: Number(i.discount ?? 0) || 0,
    })),
    expectedDeliveryDate: purchaseData.expectedDeliveryDate || undefined,
    invoiceNumber: purchaseData.invoiceNumber || purchaseData.supplierInvoiceNumber || undefined,
    notes: purchaseData.description || purchaseData.notes || undefined,
  });
  return res.data;
}

export async function fetchPurchases(params = {}) {
  const res = await api.get("/api/purchase-orders", {
    page: params.page || 1,
    page_size: params.limit || 10,
    status: params.status || undefined,
    from: params.fromDate || undefined,
    to: params.toDate || undefined,
  });
  return {
    items: res.data || [],
    total: res.meta?.totalCount ?? 0,
    page: res.meta?.page ?? 1,
    totalPages: res.meta?.totalPages ?? 1,
  };
}

export async function fetchPurchaseById(id) {
  const res = await api.get(`/api/purchase-orders/${id}`);
  return res.data;
}

export async function updatePurchase(id, updates) {
  const res = await api.put(`/api/purchase-orders/${id}`, {
    supplierId: parseInt(updates.supplierId, 10) || 0,
    items: (updates.items || []).map((i) => ({
      productId: parseInt(i.productId, 10) || 0,
      qty: Number(i.qty ?? i.orderedQty ?? 0) || 0,
      unitPrice: Number(i.unitPrice ?? 0) || 0,
      discount: Number(i.discount ?? 0) || 0,
    })),
    expectedDeliveryDate: updates.expectedDeliveryDate || undefined,
    invoiceNumber: updates.invoiceNumber || updates.supplierInvoiceNumber || undefined,
    notes: updates.description || updates.notes || undefined,
  });
  return res.data;
}

export async function updatePurchaseStatus(id, newStatus) {
  let endpoint;
  if (newStatus === PURCHASE_STATUSES.SHIPPED) {
    endpoint = `/api/purchase-orders/${id}/mark-awaiting`;
  } else if (newStatus === PURCHASE_STATUSES.RECEIVED) {
    endpoint = `/api/purchase-orders/${id}/receive`;
  } else if (newStatus === PURCHASE_STATUSES.CANCELLED) {
    endpoint = `/api/purchase-orders/${id}/cancel`;
  } else {
    endpoint = `/api/purchase-orders/${id}/confirm`;
  }
  const res = await api.post(endpoint, { status: newStatus });
  return res.data;
}

export async function removePurchase(id) {
  const res = await api.delete(`/api/purchase-orders/${id}`);
  return res.data;
}

export async function deletePurchase(id) {
  await api.post(`/api/purchase-orders/${id}/cancel`);
  return { success: true, id };
}

export async function updatePurchasePayment(id, paymentData) {
  const res = await api.post(`/api/purchase-orders/${id}/payment`, paymentData);
  return res.data;
}
