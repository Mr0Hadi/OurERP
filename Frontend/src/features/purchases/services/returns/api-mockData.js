// src/features/purchases/services/returns/api-mockData.js
import {
  allPurchaseReturns,
  RETURN_ELIGIBLE_PURCHASE_STATUSES,
  PURCHASE_RETURN_STATUSES,
} from "./mockData";
import { allPurchases } from "@/features/purchases/services/mockData";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// مرجوعی‌های لغوشده/ردشده دیگر «مصرف‌کننده‌ی سهمیه‌ی قابل مرجوع» محسوب نمی‌شوند
const ACTIVE_RETURN_STATUSES = new Set([
  PURCHASE_RETURN_STATUSES.PENDING,
  PURCHASE_RETURN_STATUSES.COORDINATING,
  PURCHASE_RETURN_STATUSES.AWAITING_REFUND,
  PURCHASE_RETURN_STATUSES.AWAITING_REPLACEMENT,
  PURCHASE_RETURN_STATUSES.RESOLVED,
]);

function getReturnedQtyMap(purchaseId, excludeReturnId = null) {
  const map = new Map();
  allPurchaseReturns
    .filter(
      (r) =>
        r.purchaseId === purchaseId &&
        r.id !== excludeReturnId &&
        ACTIVE_RETURN_STATUSES.has(r.status),
    )
    .forEach((r) => {
      r.items.forEach((item) => {
        map.set(item.productId, (map.get(item.productId) || 0) + item.qty);
      });
    });
  return map;
}

export async function fetchReturnablePurchases(params = {}) {
  await delay(400);
  const { search = "", supplierIds = [] } = params;

  let filtered = allPurchases.filter((p) =>
    RETURN_ELIGIBLE_PURCHASE_STATUSES.includes(p.status),
  );

  if (search) {
    const s = search.toLowerCase();
    filtered = filtered.filter(
      (p) =>
        p.invoiceNumber.toLowerCase().includes(s) ||
        p.supplierName.toLowerCase().includes(s),
    );
  }
  if (Array.isArray(supplierIds) && supplierIds.length) {
    filtered = filtered.filter((p) => supplierIds.includes(p.supplierId));
  }

  return filtered
    .slice()
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .map((p) => ({
      id: p.id,
      invoiceNumber: p.invoiceNumber,
      supplierId: p.supplierId,
      supplierName: p.supplierName,
      invoiceDate: p.invoiceDate,
      status: p.status,
      totalAmount: p.totalAmount,
      itemsCount: p.items.length,
    }));
}

export async function fetchReturnablePurchaseById(id) {
  await delay(300);
  const purchase = allPurchases.find((p) => Number(p.id) === Number(id));
  if (!purchase) throw new Error("خرید یافت نشد");

  const returnedMap = getReturnedQtyMap(purchase.id);

  const items = purchase.items.map((item) => {
    const alreadyReturned = returnedMap.get(item.productId) || 0;
    const maxReturnableQty = Math.max(0, item.qty - alreadyReturned);
    return {
      productId: item.productId,
      productCode: item.productCode,
      productName: item.productName,
      unit: item.unit,
      orderedQty: item.qty,
      unitPrice: item.unitPrice,
      alreadyReturnedQty: alreadyReturned,
      maxReturnableQty,
    };
  });

  return {
    id: purchase.id,
    invoiceNumber: purchase.invoiceNumber,
    invoiceDate: purchase.invoiceDate,
    supplierId: purchase.supplierId,
    supplierName: purchase.supplierName,
    status: purchase.status,
    items,
  };
}

export async function fetchPurchaseReturns(params = {}) {
  await delay(500);
  const {
    page = 1,
    limit = 10,
    search = "",
    supplierIds = [],
    status = "",
    reason = "",
    fromDate = "",
    toDate = "",
    sortBy = "createdAt",
    sortOrder = "desc",
  } = params;

  let filtered = [...allPurchaseReturns];

  if (search) {
    const s = search.toLowerCase();
    filtered = filtered.filter(
      (r) =>
        r.returnNumber.toLowerCase().includes(s) ||
        r.purchaseInvoiceNumber.toLowerCase().includes(s) ||
        r.supplierName.toLowerCase().includes(s),
    );
  }
  if (Array.isArray(supplierIds) && supplierIds.length) {
    filtered = filtered.filter((r) =>
      supplierIds.map(String).includes(String(r.supplierId)),
    );
  }
  if (status) filtered = filtered.filter((r) => r.status === status);
  if (reason) filtered = filtered.filter((r) => r.reason === reason);
  if (fromDate) {
    filtered = filtered.filter(
      (r) => r.returnDate && r.returnDate.slice(0, 10) >= fromDate.slice(0, 10),
    );
  }
  if (toDate) {
    filtered = filtered.filter(
      (r) => r.returnDate && r.returnDate.slice(0, 10) <= toDate.slice(0, 10),
    );
  }

  filtered.sort((a, b) => {
    let aVal = a[sortBy];
    let bVal = b[sortBy];
    if (["createdAt", "updatedAt", "returnDate"].includes(sortBy)) {
      aVal = new Date(aVal).getTime();
      bVal = new Date(bVal).getTime();
    } else if (sortBy === "totalAmount") {
      aVal = Number(aVal);
      bVal = Number(bVal);
    } else if (typeof aVal === "string") {
      return sortOrder === "asc"
        ? aVal.localeCompare(bVal, "fa")
        : bVal.localeCompare(aVal, "fa");
    }
    return sortOrder === "asc" ? (aVal > bVal ? 1 : -1) : aVal < bVal ? 1 : -1;
  });

  const total = filtered.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const start = (page - 1) * limit;
  const items = filtered.slice(start, start + limit);

  return { items, total, page, totalPages };
}

export async function fetchPurchaseReturnById(id) {
  await delay(300);
  const item = allPurchaseReturns.find((r) => Number(r.id) === Number(id));
  if (!item) throw new Error("مرجوعی یافت نشد");
  return item;
}

export async function createPurchaseReturn(payload) {
  await delay(700);
  const newId = allPurchaseReturns.length
    ? Math.max(...allPurchaseReturns.map((r) => Number(r.id) || 0)) + 1
    : 1;
  const returnNumber = `RET-2026-${String(newId).padStart(3, "0")}`;
  const totalAmount = payload.items.reduce((sum, i) => sum + i.lineTotal, 0);

  const newReturn = {
    id: newId,
    returnNumber,
    status: PURCHASE_RETURN_STATUSES.PENDING,
    resolutionType: "none",
    refundAmount: 0,
    supplierResponseNote: "",
    ...payload,
    totalAmount,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  allPurchaseReturns.unshift(newReturn);
  return newReturn;
}

export async function updatePurchaseReturn(id, updates) {
  await delay(500);
  const index = allPurchaseReturns.findIndex((r) => Number(r.id) === Number(id));
  if (index === -1) throw new Error("مرجوعی یافت نشد");
  allPurchaseReturns[index] = {
    ...allPurchaseReturns[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  return allPurchaseReturns[index];
}

export async function updatePurchaseReturnStatus(id, statusData) {
  return updatePurchaseReturn(id, statusData);
}

export async function removePurchaseReturn(id) {
  await delay(500);
  const index = allPurchaseReturns.findIndex((r) => Number(r.id) === Number(id));
  if (index === -1) throw new Error("مرجوعی یافت نشد");
  const removed = allPurchaseReturns.splice(index, 1)[0];
  return removed;
}