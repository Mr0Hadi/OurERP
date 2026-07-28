// src/features/warehouse/receiving/services/api-mockData

import {
  allPurchases,
  PURCHASE_STATUSES,
  PURCHASE_STATUS_LABELS,
} from "./mockData";
import { autoResolveReplacementReturns } from "@/features/purchases/services/returns/api-mockData";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// این صفحه از این پس فقط برای خریدهایی معنا دارد که «ارسال شده» ولی
// هنوز هیچ دریافتی برایشان ثبت نشده است (shipped). به‌محض این‌که
// انباردار یک دور دریافت با کسری ثبت کند (partially_received)، خرید
// از این لیست خارج می‌شود؛ چون دیگر کاری برای انباردار باقی نمانده و
// نوبت واحد خرید است که با تامین‌کننده هماهنگ کند. تنها زمانی که واحد
// خرید هماهنگ کرد تامین‌کننده کالای جایگزین ارسال می‌کند، وضعیت خرید
// به‌طور خودکار به «ارسال شده» برمی‌گردد و دوباره اینجا ظاهر می‌شود
// (به تابع reopenPurchaseForShipment در ماژول مرجوعی مراجعه کنید).
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

  return {
    items,
    total,
    page,
    totalPages,
  };
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
 * سه نکته‌ی مهم:
 * ۱. مقدار دریافتی هر قلم تجمعی است تا دورهای بعدی دریافت فقط
 *    باقیمانده‌ی واقعی را «مورد انتظار» بدانند.
 * ۲. اگر قلمی در این دور همچنان کسری داشته باشد، نوع مشکل و یادداشت
 *    انباردار روی خودِ آیتم خرید ذخیره می‌شود تا واحد خرید بعداً دقیقاً
 *    همان را ببیند.
 * ۳. پس از به‌روزرسانی آیتم‌ها، بررسی می‌شود که آیا مرجوعی‌ای با وضعیت
 *    «در انتظار ارسال جایگزین» برای این خرید وجود دارد که با همین
 *    دریافت به‌طور کامل پوشش داده شده باشد؛ اگر بله، آن مرجوعی به‌طور
 *    خودکار به وضعیت «تسویه‌شده» تغییر می‌کند — بدون نیاز به اقدام
 *    دستی واحد خرید.
 */
export async function confirmReceiving(purchaseId, receivingData) {
  await delay(500);

  const index = allPurchases.findIndex((p) => p.id === purchaseId);
  if (index === -1) throw new Error("خرید یافت نشد");

  const purchase = allPurchases[index];

  const updatedItems = purchase.items.map((item) => {
    const receivedItem = receivingData.receivedItems.find(
      (ri) => ri.productId === item.productId,
    );
    if (!receivedItem) return item;

    const prevReceived = item.receivedQty || 0;
    const newReceivedQty = prevReceived + (receivedItem.receivedQty || 0);
    const shortageThisRound =
      (receivedItem.expectedQty || 0) - (receivedItem.receivedQty || 0);

    if (shortageThisRound > 0) {
      return {
        ...item,
        receivedQty: newReceivedQty,
        lastIssueType: receivedItem.issueType || "shortage",
        lastIssueNote: receivedItem.note || "",
        lastIssueDate:
          receivingData.receivedDate || new Date().toISOString().slice(0, 10),
      };
    }

    return {
      ...item,
      receivedQty: newReceivedQty,
      lastIssueType: null,
      lastIssueNote: null,
      lastIssueDate: null,
    };
  });

  allPurchases[index] = {
    ...purchase,
    items: updatedItems,
    status: receivingData.status,
    receivedItems: receivingData.receivedItems,
    receivingNote: receivingData.receivingNote,
    receivedDate: receivingData.receivedDate,
    transporterName: receivingData.transporterName || "",
    transporterNationalId: receivingData.transporterNationalId || "",
    vehiclePlate: receivingData.vehiclePlate || "",
    updatedAt: new Date().toISOString(),
  };

  // بررسی و بستن خودکار مرجوعی‌های «در انتظار ارسال جایگزین» که با
  // همین دریافت به‌طور کامل پوشش داده شده‌اند
  autoResolveReplacementReturns(purchaseId, updatedItems);

  return allPurchases[index];
}