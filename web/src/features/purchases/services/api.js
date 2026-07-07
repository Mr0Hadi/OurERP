import { api } from "@/shared/lib/api";
import { PURCHASE_STATUSES, PURCHASE_STATUS_LABELS, PAYMENT_TYPES, PAYMENT_TYPE_LABELS } from "./constants";

export { PURCHASE_STATUSES, PURCHASE_STATUS_LABELS, PAYMENT_TYPES, PAYMENT_TYPE_LABELS };

function mapPOItem(i) {
  return {
    productId: String(i.product_id),
    productCode: i.product_code || "",
    productName: i.product_name || "",
    qty: i.ordered_quantity ?? 0,
    orderedQty: i.ordered_quantity ?? 0,
    unitPrice: i.unit_price ?? 0,
    discount: i.discount ?? 0,
    receivedQty: i.received_quantity ?? 0,
    lineTotal: (i.ordered_quantity ?? 0) * (i.unit_price ?? 0) * (1 - (i.discount ?? 0) / 100),
  };
}

function mapPurchaseOrder(po) {
  const items = (po.items || []).map(mapPOItem);
  const totalAmount = items.reduce((sum, i) => sum + i.lineTotal, 0);
  return {
    id: String(po.id),
    supplierId: String(po.supplier_id ?? ""),
    supplierName: po.supplier_name || "",
    invoiceNumber: po.supplier_invoice_number || "",
    invoiceDate: po.created_at ? po.created_at.split("T")[0] : "",
    status: po.status || PURCHASE_STATUSES.PENDING,
    paymentType: PAYMENT_TYPES.CREDIT,
    paidAmount: 0,
    totalAmount: po.total_amount ?? totalAmount,
    description: po.notes || "",
    notes: po.notes || "",
    items,
    expectedDeliveryDate: po.expected_delivery_date || "",
    createdAt: po.created_at || "",
    updatedAt: po.updated_at || "",
  };
}

function mapPOItemForCreate(i) {
  return {
    product_id: parseInt(i.productId, 10),
    ordered_quantity: i.qty ?? i.orderedQty ?? 0,
    unit_price: i.unitPrice ?? 0,
  };
}

function mapPurchaseOrderForCreate(data) {
  return {
    supplier_id: parseInt(data.supplierId, 10) || 0,
    items: (data.items || []).map(mapPOItemForCreate),
    expected_delivery_date: data.expectedDeliveryDate || undefined,
    supplier_invoice_number: data.invoiceNumber || data.supplierInvoiceNumber || undefined,
    notes: data.description || data.notes || undefined,
  };
}

export async function createPurchase(purchaseData) {
  const res = await api.post("/api/purchase-orders", mapPurchaseOrderForCreate(purchaseData));
  return mapPurchaseOrder(res.data);
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
    items: (res.data || []).map(mapPurchaseOrder),
    total: res.meta?.total_count ?? 0,
    page: res.meta?.page ?? 1,
    totalPages: res.meta?.total_pages ?? 1,
  };
}

export async function fetchPurchaseById(id) {
  const res = await api.get(`/api/purchase-orders/${id}`);
  return mapPurchaseOrder(res.data);
}

export async function updatePurchase(id, updates) {
  const res = await api.put(`/api/purchase-orders/${id}`, mapPurchaseOrderForCreate(updates));
  return mapPurchaseOrder(res.data);
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
  return mapPurchaseOrder(res.data);
}

export async function removePurchase(id) {
  const res = await api.delete(`/api/purchase-orders/${id}`);
  return mapPurchaseOrder(res.data);
}

export async function deletePurchase(id) {
  await api.post(`/api/purchase-orders/${id}/cancel`);
  return { success: true, id };
}

export async function updatePurchasePayment(id, paymentData) {
  const res = await api.post(`/api/purchase-orders/${id}/payment`, paymentData);
  return mapPurchaseOrder(res.data);
}
