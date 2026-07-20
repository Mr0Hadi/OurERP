import { api } from "@/shared/services/api/api";
import { SALE_STATUSES, SALE_STATUS_LABELS, PAYMENT_TYPES, PAYMENT_TYPE_LABELS } from "./constants";

export { SALE_STATUSES, SALE_STATUS_LABELS, PAYMENT_TYPES, PAYMENT_TYPE_LABELS };

export async function createSale(saleData) {
  const res = await api.post("/api/sales", {
    customerId: parseInt(saleData.customerId, 10) || 0,
    items: (saleData.items || []).map((i) => ({
      productId: parseInt(i.productId, 10),
      productCode: i.productCode || "",
      productName: i.productName || "",
      unit: i.unit || "piece",
      qty: i.qty ?? 0,
      unitPrice: i.unitPrice ?? 0,
      discount: i.discount ?? 0,
    })),
    invoiceDate: saleData.invoiceDate || undefined,
    dueDate: saleData.dueDate || undefined,
    description: saleData.description || undefined,
    status: saleData.status || SALE_STATUSES.PENDING,
    paymentType: saleData.paymentType || PAYMENT_TYPES.CASH,
    paidAmount: saleData.paidAmount ?? 0,
    totalAmount: saleData.totalAmount ?? 0,
    checkNumber: saleData.checkNumber || undefined,
    transferRef: saleData.transferRef || undefined,
  });
  return res.data;
}

export async function fetchSales(params = {}) {
  const res = await api.get("/api/sales", {
    page: params.page || 1,
    page_size: params.limit || 10,
    status: params.status || undefined,
    customer_id: params.customerId || undefined,
    payment_type: params.paymentType || undefined,
    from_date: params.fromDate || undefined,
    to_date: params.toDate || undefined,
  });
  return {
    items: res.data || [],
    total: res.meta?.totalCount ?? 0,
    page: res.meta?.page ?? 1,
    totalPages: res.meta?.totalPages ?? 1,
  };
}

export async function fetchSaleById(id) {
  const res = await api.get(`/api/sales/${id}`);
  return res.data;
}

export async function updateSale(id, updates) {
  const res = await api.put(`/api/sales/${id}`, {
    customerId: parseInt(updates.customerId, 10) || 0,
    items: (updates.items || []).map((i) => ({
      productId: parseInt(i.productId, 10),
      productCode: i.productCode || "",
      productName: i.productName || "",
      unit: i.unit || "piece",
      qty: i.qty ?? 0,
      unitPrice: i.unitPrice ?? 0,
      discount: i.discount ?? 0,
    })),
    invoiceDate: updates.invoiceDate || undefined,
    dueDate: updates.dueDate || undefined,
    description: updates.description || undefined,
    status: updates.status || SALE_STATUSES.PENDING,
    paymentType: updates.paymentType || PAYMENT_TYPES.CASH,
    paidAmount: updates.paidAmount ?? 0,
    totalAmount: updates.totalAmount ?? 0,
    checkNumber: updates.checkNumber || undefined,
    transferRef: updates.transferRef || undefined,
  });
  return res.data;
}

export async function updateSaleStatus(id, newStatus) {
  const res = await api.post(`/api/sales/${id}/status`, { status: newStatus });
  return res.data;
}

export async function removeSale(id) {
  const res = await api.delete(`/api/sales/${id}`);
  return res.data;
}

export async function deleteSale(id) {
  await api.post(`/api/sales/${id}/status`, { status: SALE_STATUSES.CANCELLED });
  return { success: true, id };
}

export async function updateSalePayment(id, paymentData) {
  const res = await api.post(`/api/sales/${id}/payment`, paymentData);
  return res.data;
}
