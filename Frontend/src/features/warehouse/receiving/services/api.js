import { api } from "@/shared/services/api/api";
import { PURCHASE_STATUSES, PURCHASE_STATUS_LABELS, PAYMENT_TYPES, PAYMENT_TYPE_LABELS } from "@/features/purchases/services/constants";

export { PURCHASE_STATUSES, PURCHASE_STATUS_LABELS, PAYMENT_TYPES, PAYMENT_TYPE_LABELS };

const RECEIVING_ELIGIBLE_STATUSES = [
  PURCHASE_STATUSES.SHIPPED,
  PURCHASE_STATUSES.PARTIALLY_RECEIVED,
];

export const RECEIVING_ELIGIBLE_STATUSES_LIST = RECEIVING_ELIGIBLE_STATUSES;

export const RECEIVING_STATUS_LABELS = Object.fromEntries(
  Object.entries(PURCHASE_STATUS_LABELS).filter(([key]) =>
    RECEIVING_ELIGIBLE_STATUSES.includes(key)
  )
);

function mapPOItem(i) {
  return {
    productId: String(i.product_id),
    productCode: i.product_code || "",
    productName: i.product_name || "",
    orderedQty: i.ordered_quantity ?? 0,
    qty: i.ordered_quantity ?? 0,
    unitPrice: i.unit_price ?? 0,
    receivedQty: i.received_quantity ?? 0,
    discount: i.discount ?? 0,
  };
}

function mapPurchaseOrder(po) {
  return {
    id: String(po.id),
    supplierId: String(po.supplier_id ?? ""),
    supplierName: po.supplier_name || "",
    invoiceNumber: po.supplier_invoice_number || "",
    invoiceDate: po.created_at ? po.created_at.split("T")[0] : "",
    status: po.status || PURCHASE_STATUSES.PENDING,
    paymentType: PAYMENT_TYPES.CREDIT,
    paidAmount: 0,
    totalAmount: po.total_amount ?? 0,
    description: po.notes || "",
    items: (po.items || []).map(mapPOItem),
    createdAt: po.created_at || "",
    updatedAt: po.updated_at || "",
  };
}

export async function fetchReceivingPurchases(params = {}) {
  const { page = 1, limit = 10, search = "", status = "", fromDate = "", toDate = "" } = params;

  const statusFilter = status || RECEIVING_ELIGIBLE_STATUSES.join(",");

  const res = await api.get("/api/purchase-orders", {
    page,
    page_size: limit,
    status: statusFilter || undefined,
    from: fromDate || undefined,
    to: toDate || undefined,
  });

  let items = (res.data || []).map(mapPurchaseOrder);

  if (search) {
    const q = search.toLowerCase();
    items = items.filter(
      (p) =>
        p.invoiceNumber.toLowerCase().includes(q) ||
        p.supplierName.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q))
    );
  }

  items = items.filter((p) => RECEIVING_ELIGIBLE_STATUSES.includes(p.status));

  return {
    items,
    total: res.meta?.total_count ?? 0,
    page: res.meta?.page ?? 1,
    totalPages: res.meta?.total_pages ?? 1,
  };
}

export async function fetchReceivingPurchaseById(id) {
  const res = await api.get(`/api/purchase-orders/${id}`);
  return mapPurchaseOrder(res.data);
}

export async function updateReceivingStatus(id, receivedItems) {
  const res = await api.get(`/api/purchase-orders/${id}`);
  const po = res.data;

  const allItemsReceived = receivedItems.every((item) => item.receivedQty >= item.orderedQty);
  const anyItemReceived = receivedItems.some((item) => item.receivedQty > 0);
  const noItemReceived = receivedItems.every((item) => item.receivedQty === 0);

  let newStatus;
  if (noItemReceived) {
    newStatus = PURCHASE_STATUSES.SHIPPED;
  } else if (allItemsReceived) {
    newStatus = PURCHASE_STATUSES.RECEIVED;
  } else if (anyItemReceived) {
    newStatus = PURCHASE_STATUSES.PARTIALLY_RECEIVED;
  } else {
    newStatus = po.status;
  }

  const updated = {
    ...po,
    status: newStatus,
    items: (po.items || []).map((item) => {
      const receivedItem = receivedItems.find((ri) => ri.productId === String(item.product_id));
      return receivedItem ? { ...item, received_quantity: receivedItem.receivedQty } : item;
    }),
  };

  return mapPurchaseOrder(updated);
}

export async function confirmReceiving(purchaseId, receivingData) {
  const res = await api.post(`/api/purchase-orders/${purchaseId}/receive`, {
    items: (receivingData.receivedItems || []).map((item) => ({
      product_id: parseInt(item.productId, 10),
      ordered_quantity: item.orderedQty ?? item.qty ?? 0,
      unit_price: item.unitPrice ?? 0,
      received_quantity: item.receivedQty ?? 0,
      discrepancy_note: "",
    })),
  });
  return mapPurchaseOrder({ ...res.data, id: purchaseId });
}
