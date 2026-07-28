// src/features/purchases/services/returns/mockData.js
import { allPurchases, PURCHASE_STATUSES } from "@/features/purchases/services/mockData";
import {
  PURCHASE_ISSUE_TYPES,
  PURCHASE_ISSUE_TYPE_LABELS,
} from "@/shared/constants/purchaseIssueTypes";

// دلایل مرجوعی = همان نوع‌های مشکلی که انبار گزارش می‌دهد + یک مورد
// اضافه («ارسال اضافه») که مختص مرجوعی داوطلبانه (نه ناشی از کسری) است.
export const PURCHASE_RETURN_REASONS = {
  ...PURCHASE_ISSUE_TYPES,
  EXCESS: "excess",
};

export const PURCHASE_RETURN_REASON_LABELS = {
  ...PURCHASE_ISSUE_TYPE_LABELS,
  [PURCHASE_RETURN_REASONS.EXCESS]: "ارسال اضافه (مرجوع داوطلبانه)",
};

export const PURCHASE_RETURN_STATUSES = {
  PENDING: "pending",
  COORDINATING: "coordinating",
  AWAITING_REFUND: "awaiting_refund",
  AWAITING_REPLACEMENT: "awaiting_replacement",
  RESOLVED: "resolved",
  REJECTED: "rejected",
  CANCELLED: "cancelled",
};

export const PURCHASE_RETURN_STATUS_LABELS = {
  [PURCHASE_RETURN_STATUSES.PENDING]: "در انتظار بررسی",
  [PURCHASE_RETURN_STATUSES.COORDINATING]: "در حال هماهنگی با تامین‌کننده",
  [PURCHASE_RETURN_STATUSES.AWAITING_REFUND]: "در انتظار بازگشت وجه",
  [PURCHASE_RETURN_STATUSES.AWAITING_REPLACEMENT]: "در انتظار ارسال جایگزین",
  [PURCHASE_RETURN_STATUSES.RESOLVED]: "تسویه شده",
  [PURCHASE_RETURN_STATUSES.REJECTED]: "رد شده توسط تامین‌کننده",
  [PURCHASE_RETURN_STATUSES.CANCELLED]: "لغو شده",
};

export const RESOLUTION_TYPES = {
  NONE: "none",
  REFUND: "refund",
  REPLACEMENT: "replacement",
  CREDIT: "credit",
  WRITE_OFF: "write_off",
};

export const RESOLUTION_TYPE_LABELS = {
  [RESOLUTION_TYPES.NONE]: "تعیین نشده",
  [RESOLUTION_TYPES.REFUND]: "بازگشت وجه نقدی",
  [RESOLUTION_TYPES.REPLACEMENT]: "ارسال کالای جایگزین",
  [RESOLUTION_TYPES.CREDIT]: "اعتبار در خرید بعدی",
  [RESOLUTION_TYPES.WRITE_OFF]: "پذیرش زیان (بدون بازگشت وجه)",
};

// فقط برای تولید داده‌ی نمونه (mock seed) استفاده می‌شود
const SEED_ELIGIBLE_STATUSES = [
  PURCHASE_STATUSES.PARTIALLY_RECEIVED,
  PURCHASE_STATUSES.RECEIVED,
];

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pickRandom(arr) {
  return arr[randomInt(0, arr.length - 1)];
}
function formatDate(d) {
  return d.toISOString().slice(0, 10);
}

const REASONS_LIST = Object.values(PURCHASE_RETURN_REASONS);
const seedEligiblePurchases = allPurchases.filter((p) =>
  SEED_ELIGIBLE_STATUSES.includes(p.status),
);

function buildReturnFromPurchase(purchase, index) {
  const itemsCount = Math.min(purchase.items.length, randomInt(1, 2));
  const pickedItems = [...purchase.items]
    .sort(() => 0.5 - Math.random())
    .slice(0, itemsCount);

  const reason = pickRandom(REASONS_LIST);

  const items = pickedItems.map((item) => {
    const qty = Math.max(1, Math.min(item.qty, randomInt(1, 4)));
    return {
      productId: item.productId,
      productCode: item.productCode,
      productName: item.productName,
      unit: item.unit,
      qty,
      unitPrice: item.unitPrice,
      lineTotal: qty * item.unitPrice,
      reason,
      note: "",
    };
  });

  const totalAmount = items.reduce((sum, i) => sum + i.lineTotal, 0);
  const status = pickRandom(Object.values(PURCHASE_RETURN_STATUSES));

  let resolutionType = RESOLUTION_TYPES.NONE;
  let refundAmount = 0;
  if (status === PURCHASE_RETURN_STATUSES.AWAITING_REFUND) {
    resolutionType = RESOLUTION_TYPES.REFUND;
  } else if (status === PURCHASE_RETURN_STATUSES.AWAITING_REPLACEMENT) {
    resolutionType = RESOLUTION_TYPES.REPLACEMENT;
  } else if (status === PURCHASE_RETURN_STATUSES.RESOLVED) {
    resolutionType = pickRandom([
      RESOLUTION_TYPES.REFUND,
      RESOLUTION_TYPES.REPLACEMENT,
      RESOLUTION_TYPES.CREDIT,
      RESOLUTION_TYPES.WRITE_OFF,
    ]);
    if (resolutionType === RESOLUTION_TYPES.REFUND) refundAmount = totalAmount;
  }

  const createdDate = new Date(purchase.createdAt);
  createdDate.setDate(createdDate.getDate() + randomInt(1, 10));

  return {
    id: index + 1,
    returnNumber: `RET-2026-${String(index + 1).padStart(3, "0")}`,
    purchaseId: purchase.id,
    purchaseInvoiceNumber: purchase.invoiceNumber,
    supplierId: purchase.supplierId,
    supplierName: purchase.supplierName,
    returnDate: formatDate(createdDate),
    reason,
    status,
    resolutionType,
    items,
    totalAmount,
    refundAmount,
    description: "",
    supplierResponseNote: "",
    createdAt: createdDate.toISOString(),
    updatedAt: createdDate.toISOString(),
  };
}

export const purchaseReturnsMock = seedEligiblePurchases
  .slice(0, 12)
  .map((purchase, idx) => buildReturnFromPurchase(purchase, idx));

export const allPurchaseReturns = [...purchaseReturnsMock];