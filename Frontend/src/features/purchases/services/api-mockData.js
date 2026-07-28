// src/features/purchases/services/api-mockData.js

import { allPurchases, PURCHASE_STATUSES } from "./mockData";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function createPurchase(purchaseData) {
  await delay(800);

  if (Math.random() < 0.05) {
    throw new Error("خطا در ثبت خرید");
  }

  const newId = allPurchases.length
    ? Math.max(...allPurchases.map((p) => Number(p.id) || 0)) + 1
    : 1;

  const newPurchase = {
    id: newId,
    ...purchaseData,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  allPurchases.unshift(newPurchase);
  return newPurchase;
}

export async function fetchPurchases(params = {}) {
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

  let filtered = [...allPurchases];

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
    filtered = filtered.filter((p) =>
      supplierIds.map(String).includes(String(p.supplierId)),
    );
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

    if (sortBy === "createdAt" || sortBy === "updatedAt") {
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

export async function fetchPurchaseById(id) {
  await delay(300);

  const purchase = allPurchases.find((p) => Number(p.id) === Number(id));

  if (!purchase) {
    throw new Error("خرید یافت نشد");
  }

  return purchase;
}

export async function updatePurchase(id, updates) {
  await delay(600);

  const index = allPurchases.findIndex((p) => Number(p.id) === Number(id));

  if (index === -1) {
    throw new Error("خرید یافت نشد");
  }

  allPurchases[index] = {
    ...allPurchases[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  return allPurchases[index];
}

export async function updatePurchaseStatus(id, newStatus) {
  return updatePurchase(id, { status: newStatus });
}

export async function removePurchase(id) {
  await delay(600);

  const index = allPurchases.findIndex((p) => Number(p.id) === Number(id));

  if (index === -1) {
    throw new Error("خرید یافت نشد");
  }

  const removed = allPurchases.splice(index, 1)[0];
  return removed;
}

export async function deletePurchase(id) {
  return updatePurchaseStatus(id, PURCHASE_STATUSES.CANCELLED);
}

export async function updatePurchasePayment(id, paymentData) {
  await delay(600);

  const index = allPurchases.findIndex((p) => Number(p.id) === Number(id));

  if (index === -1) {
    throw new Error("خرید یافت نشد");
  }

  const currentPurchase = allPurchases[index];
  const newPaidAmount = currentPurchase.paidAmount + (paymentData.amount || 0);

  allPurchases[index] = {
    ...currentPurchase,
    paidAmount: newPaidAmount,
    updatedAt: new Date().toISOString(),
    ...paymentData,
  };

  return allPurchases[index];
}

/**
 * وقتی یک قلم کسری از طریق مرجوعی «تسویه» می‌شود — بازگشت وجه، پذیرش
 * زیان یا اعتبار خرید بعدی — دیگر نباید در گزارش‌های کسری ظاهر شود.
 * این تابع settledQty را تجمعی افزایش می‌دهد، در صورت رفع کامل کسری
 * گزارش باز آن قلم (lastIssueType/Note/Date) را می‌بندد، و در صورت
 * وجود مبلغ بازگشتی، از جمع کل خرید کم می‌کند.
 *
 * نوع «جایگزینی» (replacement) از این تابع رد نمی‌شود؛ چون تکمیل
 * واقعی‌اش باید از مسیر دریافت انبار (receivedQty) اتفاق بیفتد.
 */
export async function settlePurchaseItems(
  purchaseId,
  settledItems,
  { refundAmount = 0 } = {},
) {
  await delay(400);

  const index = allPurchases.findIndex(
    (p) => Number(p.id) === Number(purchaseId),
  );
  if (index === -1) {
    throw new Error("خرید یافت نشد");
  }

  const purchase = allPurchases[index];

  const updatedItems = purchase.items.map((item) => {
    const settle = settledItems.find((s) => s.productId === item.productId);
    if (!settle) return item;

    const newSettledQty = (item.settledQty || 0) + (settle.qty || 0);
    const openShortage =
      item.qty - (item.receivedQty || 0) - newSettledQty;

    return {
      ...item,
      settledQty: newSettledQty,
      ...(openShortage <= 0
        ? { lastIssueType: null, lastIssueNote: null, lastIssueDate: null }
        : {}),
    };
  });

  const fullyClosed = updatedItems.every(
    (item) => (item.receivedQty || 0) + (item.settledQty || 0) >= item.qty,
  );
  const anyReceived = updatedItems.some((item) => (item.receivedQty || 0) > 0);

  let newStatus = purchase.status;
  if (fullyClosed) {
    newStatus = PURCHASE_STATUSES.RECEIVED;
  } else if (anyReceived) {
    newStatus = PURCHASE_STATUSES.PARTIALLY_RECEIVED;
  }

  allPurchases[index] = {
    ...purchase,
    items: updatedItems,
    totalAmount: Math.max(0, purchase.totalAmount - refundAmount),
    status: newStatus,
    updatedAt: new Date().toISOString(),
  };

  return allPurchases[index];
}