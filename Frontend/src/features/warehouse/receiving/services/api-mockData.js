// src/features/warehouse/receiving/services/api-mockData
import {
  allPurchases,
  PURCHASE_STATUSES,
  PURCHASE_STATUS_LABELS,
} from "./mockData";
import { autoResolveReplacementReturns } from "@/features/purchases/services/returns/api-mockData";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const generateId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export const RECEIVING_ELIGIBLE_STATUSES = [PURCHASE_STATUSES.SHIPPED];

export const RECEIVING_STATUS_LABELS = Object.fromEntries(
  Object.entries(PURCHASE_STATUS_LABELS).filter(([key]) =>
    RECEIVING_ELIGIBLE_STATUSES.includes(key),
  ),
);

export async function fetchReceivingPurchases(params = {}) {
  await delay(500);

  const {
    page = 1,
    limit = 10,
    search = "",
    supplierIds = [],
    status = "",
    paymentType = "",
    fromDate = "",
    toDate = "",
    sortBy = "createdAt",
    sortOrder = "desc",
  } = params;

  let filtered = allPurchases.filter((p) =>
    RECEIVING_ELIGIBLE_STATUSES.includes(p.status),
  );

  if (search) {
    const searchLower = search.toLowerCase();
    filtered = filtered.filter(
      (p) =>
        p.invoiceNumber.toLowerCase().includes(searchLower) ||
        p.supplierName.toLowerCase().includes(searchLower) ||
        (p.description && p.description.toLowerCase().includes(searchLower)),
    );
  }

  if (Array.isArray(supplierIds) && supplierIds.length > 0) {
    filtered = filtered.filter((p) => supplierIds.includes(p.supplierId));
  }

  if (status) {
    filtered = filtered.filter((p) => p.status === status);
  }

  if (paymentType) {
    filtered = filtered.filter((p) => p.paymentType === paymentType);
  }

  if (fromDate) {
    filtered = filtered.filter(
      (p) =>
        p.invoiceDate && p.invoiceDate.slice(0, 10) >= fromDate.slice(0, 10),
    );
  }
  if (toDate) {
    filtered = filtered.filter(
      (p) => p.invoiceDate && p.invoiceDate.slice(0, 10) <= toDate.slice(0, 10),
    );
  }

  filtered.sort((a, b) => {
    let aVal = a[sortBy];
    let bVal = b[sortBy];

    if (
      sortBy === "createdAt" ||
      sortBy === "updatedAt" ||
      sortBy === "invoiceDate"
    ) {
      aVal = new Date(aVal).getTime();
      bVal = new Date(bVal).getTime();
    } else if (sortBy === "totalAmount" || sortBy === "paidAmount") {
      aVal = Number(aVal);
      bVal = Number(bVal);
    } else if (typeof aVal === "string") {
      return sortOrder === "asc"
        ? aVal.localeCompare(bVal, "fa")
        : bVal.localeCompare(aVal, "fa");
    }

    if (sortOrder === "asc") {
      return aVal > bVal ? 1 : -1;
    }
    return aVal < bVal ? 1 : -1;
  });

  const total = filtered.length;
  const totalPages = Math.ceil(total / limit);
  const start = (page - 1) * limit;
  const end = start + limit;
  const items = filtered.slice(start, end);

  return { items, total, page, totalPages };
}

export async function fetchReceivingPurchaseById(id) {
  await delay(300);

  const purchase = allPurchases.find((p) => p.id === id);

  if (!purchase) {
    throw new Error("خرید یافت نشد");
  }

  return purchase;
}

export async function updateReceivingStatus(id, receivedItems) {
  await delay(600);

  const index = allPurchases.findIndex((p) => p.id === id);

  if (index === -1) {
    throw new Error("خرید یافت نشد");
  }

  const originalPurchase = allPurchases[index];
  const allItemsReceived = receivedItems.every(
    (item) => item.receivedQty >= item.orderedQty,
  );
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
    newStatus = originalPurchase.status;
  }

  allPurchases[index] = {
    ...originalPurchase,
    status: newStatus,
    items: originalPurchase.items.map((item) => {
      const receivedItem = receivedItems.find(
        (ri) => ri.productId === item.productId,
      );
      return receivedItem
        ? { ...item, receivedQty: receivedItem.receivedQty }
        : item;
    }),
    updatedAt: new Date().toISOString(),
  };

  return allPurchases[index];
}

/**
 * ثبت نهایی یک «دور دریافت» در انبار.
 *
 * - مقدار دریافتی هر قلم تجمعی است (item.receivedQty += این‌دور).
 * - اگر قلمی در این دور کسری داشته باشد، ردیف‌های تفکیک‌شده‌ی نوع
 *   مشکل (که ممکن است شامل چند نوع مختلف مثل کسری + معیوب باشد) با
 *   شناسه‌ی یکتا به آرایه‌ی item.issues اضافه می‌شوند (تاریخچه‌ی کامل
 *   حفظ می‌شود، نه فقط آخرین وضعیت).
 * - در پایان، بررسی می‌شود که آیا این دریافت باعث تکمیل مرجوعی‌های
 *   «در انتظار ارسال جایگزین» شده یا نه (اتوماتیک، بدون نیاز به
 *   اقدام دستی واحد خرید).
 */
export async function confirmReceiving(purchaseId, receivingData) {
  await delay(500);

  const index = allPurchases.findIndex((p) => p.id === purchaseId);
  if (index === -1) throw new Error("خرید یافت نشد");

  const purchase = allPurchases[index];
  const receivedDate =
    receivingData.receivedDate || new Date().toISOString().slice(0, 10);

  const updatedItems = purchase.items.map((item) => {
    const receivedItem = receivingData.receivedItems.find(
      (ri) => ri.productId === item.productId,
    );
    if (!receivedItem) return item;

    const prevReceived = item.receivedQty || 0;
    const newReceivedQty = prevReceived + (receivedItem.receivedQty || 0);
    const shortageThisRound =
      (receivedItem.expectedQty || 0) - (receivedItem.receivedQty || 0);

    let newIssues = item.issues || [];
    if (shortageThisRound > 0) {
      const breakdown =
        receivedItem.issues && receivedItem.issues.length > 0
          ? receivedItem.issues
          : [{ type: "shortage", qty: shortageThisRound, note: "" }];

      const appended = breakdown
        .filter((b) => (Number(b.qty) || 0) > 0)
        .map((b) => ({
          id: generateId(),
          type: b.type || "shortage",
          qty: Number(b.qty) || 0,
          note: b.note || "",
          date: receivedDate,
        }));

      newIssues = [...newIssues, ...appended];
    }

    return {
      ...item,
      receivedQty: newReceivedQty,
      issues: newIssues,
    };
  });

  allPurchases[index] = {
    ...purchase,
    items: updatedItems,
    status: receivingData.status,
    receivedItems: receivingData.receivedItems,
    receivingNote: receivingData.receivingNote,
    receivedDate,
    transporterName: receivingData.transporterName || "",
    transporterNationalId: receivingData.transporterNationalId || "",
    vehiclePlate: receivingData.vehiclePlate || "",
    updatedAt: new Date().toISOString(),
  };

  autoResolveReplacementReturns(purchaseId);

  return allPurchases[index];
}