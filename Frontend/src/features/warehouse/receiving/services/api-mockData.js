// src/features/warehouse/receiving/services/api

import { allPurchases, PURCHASE_STATUSES, PURCHASE_STATUS_LABELS } from "@/features/purchases/services/mockData";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// این صفحه فقط برای خریدهایی معنا دارد که چیزی برای «دریافت در انبار» دارند:
// - shipped: تامین‌کننده ارسال کرده ولی هنوز چیزی ثبت نشده
// - partially_received: قبلاً بخشی دریافت شده و هنوز کسری باقی مانده
// خریدهای pending هنوز ارسال نشده‌اند، received قبلاً بسته شده،
// و cancelled اصلاً به انبار نمی‌رسد؛ بنابراین از لیست دریافت حذف می‌شوند.
export const RECEIVING_ELIGIBLE_STATUSES = [
  PURCHASE_STATUSES.SHIPPED,
  PURCHASE_STATUSES.PARTIALLY_RECEIVED,
];

export const RECEIVING_STATUS_LABELS = Object.fromEntries(
  Object.entries(PURCHASE_STATUS_LABELS).filter(([key]) =>
    RECEIVING_ELIGIBLE_STATUSES.includes(key)
  )
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

  // پایه: فقط خریدهایی که واقعاً منتظر دریافت یا دارای کسری هستند
  let filtered = allPurchases.filter((p) =>
    RECEIVING_ELIGIBLE_STATUSES.includes(p.status)
  );

  // فیلتر بر اساس جستجو
  if (search) {
    const searchLower = search.toLowerCase();
    filtered = filtered.filter(
      (p) =>
        p.invoiceNumber.toLowerCase().includes(searchLower) ||
        p.supplierName.toLowerCase().includes(searchLower) ||
        (p.description && p.description.toLowerCase().includes(searchLower))
    );
  }

  // فیلتر بر اساس تأمین‌کننده
  if (Array.isArray(supplierIds) && supplierIds.length > 0) {
    filtered = filtered.filter((p) => supplierIds.includes(p.supplierId));
  }

  // فیلتر بر اساس وضعیت (فقط بین دو وضعیت مجاز بالا معنا دارد)
  if (status) {
    filtered = filtered.filter((p) => p.status === status);
  }

  // فیلتر بر اساس نوع پرداخت
  if (paymentType) {
    filtered = filtered.filter((p) => p.paymentType === paymentType);
  }

  // فیلتر بر اساس تاریخ فاکتور (invoiceDate)
  if (fromDate) {
    filtered = filtered.filter(
      (p) => new Date(p.invoiceDate) >= new Date(fromDate)
    );
  }
  if (toDate) {
    filtered = filtered.filter(
      (p) => new Date(p.invoiceDate) <= new Date(toDate)
    );
  }

  // مرتب‌سازی
  filtered.sort((a, b) => {
    let aVal = a[sortBy];
    let bVal = b[sortBy];

    if (sortBy === "createdAt" || sortBy === "updatedAt" || sortBy === "invoiceDate") {
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

  // محاسبه وضعیت جدید
  const originalPurchase = allPurchases[index];
  const allItemsReceived = receivedItems.every(item => 
    item.receivedQty >= item.orderedQty
  );
  const anyItemReceived = receivedItems.some(item => 
    item.receivedQty > 0
  );
  const noItemReceived = receivedItems.every(item => 
    item.receivedQty === 0
  );

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

  // به‌روزرسانی خرید
  allPurchases[index] = {
    ...originalPurchase,
    status: newStatus,
    items: originalPurchase.items.map(item => {
      const receivedItem = receivedItems.find(ri => ri.productId === item.productId);
      return receivedItem ? { ...item, receivedQty: receivedItem.receivedQty } : item;
    }),
    updatedAt: new Date().toISOString(),
  };

  return allPurchases[index];
}

export async function confirmReceiving(purchaseId, receivingData) {
  await delay(500);

  const index = allPurchases.findIndex((p) => p.id === purchaseId);
  if (index === -1) throw new Error('خرید یافت نشد');

  // در mockData پاسخی از سرور شبیه‌سازی می‌کنیم
  allPurchases[index] = {
    ...allPurchases[index],
    status: receivingData.status,
    receivedItems: receivingData.receivedItems,
    receivingNote: receivingData.receivingNote,
    receivedDate: receivingData.receivedDate,
    // اطلاعات تحویل‌دهنده/وسیله نقلیه برای پیگیری و رهگیری بعدی ثبت می‌شود
    transporterName: receivingData.transporterName || '',
    transporterNationalId: receivingData.transporterNationalId || '',
    vehiclePlate: receivingData.vehiclePlate || '',
    updatedAt: new Date().toISOString(),
  };

  return allPurchases[index];
}

// از mockData خریدها استفاده می‌کنیم
export { 
  PURCHASE_STATUSES, 
  PURCHASE_STATUS_LABELS, 
  PAYMENT_TYPES, 
  PAYMENT_TYPE_LABELS 
} from "@/features/purchases/services/mockData";