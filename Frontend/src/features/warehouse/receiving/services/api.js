import { api } from "@/shared/services/api/api";
import { PURCHASE_STATUSES, PURCHASE_STATUS_LABELS, PAYMENT_TYPES, PAYMENT_TYPE_LABELS } from "@/features/purchases/services/constants";

export { PURCHASE_STATUSES, PURCHASE_STATUS_LABELS, PAYMENT_TYPES, PAYMENT_TYPE_LABELS };

const RECEIVING_ELIGIBLE_STATUSES = [
  PURCHASE_STATUSES.SHIPPED,
  PURCHASE_STATUSES.PARTIALLY_RECEIVED,
  PURCHASE_STATUSES.RECEIVED,
];

export const RECEIVING_ELIGIBLE_STATUSES_LIST = RECEIVING_ELIGIBLE_STATUSES;

export const RECEIVING_STATUS_LABELS = Object.fromEntries(
  Object.entries(PURCHASE_STATUS_LABELS).filter(([key]) =>
    RECEIVING_ELIGIBLE_STATUSES.includes(key)
  )
);

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

  let items = (res.data || []).filter((p) =>
    RECEIVING_ELIGIBLE_STATUSES.includes(p.status)
  );

  if (search) {
    const q = search.toLowerCase();
    items = items.filter(
      (p) =>
        (p.invoiceNumber || "").toLowerCase().includes(q) ||
        (p.supplierName || "").toLowerCase().includes(q) ||
        (p.description || "").toLowerCase().includes(q)
    );
  }

  return {
    items,
    total: res.meta?.totalCount ?? 0,
    page: res.meta?.page ?? 1,
    totalPages: res.meta?.totalPages ?? 1,
  };
}

export async function fetchReceivingPurchaseById(id) {
  const res = await api.get(`/api/purchase-orders/${id}`);
  return res.data;
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
      const receivedItem = receivedItems.find((ri) => ri.productId === String(item.productId));
      return receivedItem ? { ...item, receivedQty: receivedItem.receivedQty } : item;
    }),
  };

  return updated;
}

export async function confirmReceiving(purchaseId, receivingData) {
  const res = await api.post(`/api/purchase-orders/${purchaseId}/receive`, {
    status: receivingData.status || "received",
    items: (receivingData.receivedItems || []).map((item) => ({
      productId: parseInt(item.productId, 10),
      qty: item.orderedQty ?? item.qty ?? 0,
      orderedQty: item.orderedQty ?? item.qty ?? 0,
      unitPrice: item.unitPrice ?? 0,
      receivedQty: item.receivedQty ?? 0,
      discrepancyNote: "",
    })),
  });
  return res.data;
}
