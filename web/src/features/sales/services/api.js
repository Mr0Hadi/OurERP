import { api } from "@/shared/lib/api";
import { SALE_STATUSES, SALE_STATUS_LABELS, PAYMENT_TYPES, PAYMENT_TYPE_LABELS } from "./constants";

export { SALE_STATUSES, SALE_STATUS_LABELS, PAYMENT_TYPES, PAYMENT_TYPE_LABELS };

function mapSaleItem(i) {
  return {
    productId: String(i.product_id),
    productCode: i.product_code || "",
    productName: i.product_name || "",
    qty: i.qty ?? 0,
    unitPrice: i.unit_price ?? 0,
    discount: i.discount ?? 0,
    lineTotal: (i.qty ?? 0) * (i.unit_price ?? 0) * (1 - (i.discount ?? 0) / 100),
  };
}

function mapSale(s) {
  return {
    id: String(s.id),
    customerId: String(s.customer_id ?? ""),
    customerName: s.customer_name || "",
    invoiceNumber: s.invoice_number || "",
    invoiceDate: s.invoice_date || "",
    status: s.status || SALE_STATUSES.PENDING,
    paymentType: s.payment_type || PAYMENT_TYPES.CASH,
    paidAmount: s.paid_amount ?? 0,
    totalAmount: s.total_amount ?? 0,
    description: s.description || "",
    checkNumber: s.check_number || "",
    transferRef: s.transfer_ref || "",
    items: (s.items || []).map(mapSaleItem),
    createdAt: s.created_at || "",
    updatedAt: s.updated_at || "",
  };
}

function mapSaleItemForCreate(i) {
  return {
    product_id: parseInt(i.productId, 10),
    product_code: i.productCode || "",
    product_name: i.productName || "",
    unit: i.unit || "piece",
    qty: i.qty ?? 0,
    unit_price: i.unitPrice ?? 0,
    discount: i.discount ?? 0,
  };
}

function mapSaleForCreate(data) {
  const result = {
    customer_id: parseInt(data.customerId, 10) || 0,
    items: (data.items || []).map(mapSaleItemForCreate),
    invoice_date: data.invoiceDate || undefined,
    description: data.description || undefined,
    status: data.status || SALE_STATUSES.PENDING,
    payment_type: data.paymentType || PAYMENT_TYPES.CASH,
    paid_amount: data.paidAmount ?? 0,
    total_amount: data.totalAmount ?? 0,
  };
  if (data.checkNumber) result.check_number = data.checkNumber;
  if (data.transferRef) result.transfer_ref = data.transferRef;
  return result;
}

export async function createSale(saleData) {
  const res = await api.post("/api/sales", mapSaleForCreate(saleData));
  return mapSale(res.data);
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
    items: (res.data || []).map(mapSale),
    total: res.meta?.total_count ?? 0,
    page: res.meta?.page ?? 1,
    totalPages: res.meta?.total_pages ?? 1,
  };
}

export async function fetchSaleById(id) {
  const res = await api.get(`/api/sales/${id}`);
  return mapSale(res.data);
}

export async function updateSale(id, updates) {
  const res = await api.put(`/api/sales/${id}`, mapSaleForCreate(updates));
  return mapSale(res.data);
}

export async function updateSaleStatus(id, newStatus) {
  const res = await api.post(`/api/sales/${id}/status`, { status: newStatus });
  return mapSale(res.data);
}

export async function removeSale(id) {
  const res = await api.delete(`/api/sales/${id}`);
  return mapSale(res.data);
}

export async function deleteSale(id) {
  await api.post(`/api/sales/${id}/status`, { status: SALE_STATUSES.CANCELLED });
  return { success: true, id };
}

export async function updateSalePayment(id, paymentData) {
  const res = await api.post(`/api/sales/${id}/payment`, paymentData);
  return mapSale(res.data);
}
