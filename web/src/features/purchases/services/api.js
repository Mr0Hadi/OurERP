// src/features/purchases/services/api.js

import { allPurchases, PURCHASE_STATUSES } from "./mockData";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function createPurchase(purchaseData) {
  await delay(800);

  if (Math.random() < 0.05) {
    throw new Error("خطا در ثبت خرید");
  }

  const newPurchase = {
    id: String(Date.now()),
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
        (p.description && p.description.toLowerCase().includes(searchLower))
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
      (p) => new Date(p.createdAt) >= new Date(fromDate)
    );
  }
  if (toDate) {
    filtered = filtered.filter(
      (p) => new Date(p.createdAt) <= new Date(toDate)
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

  return {
    items,
    total,
    page,
    totalPages,
  };
}

export async function fetchPurchaseById(id) {
  await delay(300);
  console.log(id);
  
  
  const purchase = allPurchases.find((p) => p.id === id);
  console.log(purchase);
  
  if (!purchase) {
    throw new Error("خرید یافت نشد");
  }

  return purchase;
}

export async function updatePurchase(id, updates) {
  await delay(600);

  const index = allPurchases.findIndex((p) => p.id === id);

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

  
  const index = allPurchases.findIndex((p) => p.id == id);
  const purchase = allPurchases.find((p) => p.id === id);
  

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

  const index = allPurchases.findIndex((p) => p.id === id);

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

