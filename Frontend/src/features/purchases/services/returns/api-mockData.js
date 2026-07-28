// src/features/purchases/services/returns/api-mockData.js
import {
  allPurchaseReturns,
  PURCHASE_RETURN_STATUSES,
  RESOLUTION_TYPES,
} from "./mockData";
import { allPurchases } from "@/features/purchases/services/mockData";
import { settlePurchaseItems } from "@/features/purchases/services/api-mockData";
import { PURCHASE_ISSUE_TYPES } from "@/shared/constants/purchaseIssueTypes";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// مرجوعی‌های لغوشده/ردشده دیگر «مصرف‌کننده‌ی سهمیه‌ی کسری» محسوب نمی‌شوند
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

/**
 * ساخت «گزارش کسری» یک خرید مستقیماً از روی داده‌های واقعیِ ثبت‌شده
 * توسط انباردار (item.lastIssueType / lastIssueNote / lastIssueDate) —
 * نه از یک فرم جداگانه. همین تابع منبع واحد حقیقت هم برای تب
 * «گزارش‌های کسری» و هم برای فرم ثبت مرجوعی است.
 */
function buildShortageReport(purchase) {
  const returnedMap = getReturnedQtyMap(purchase.id);

  const items = purchase.items
    .map((item) => {
      const returned = returnedMap.get(item.productId) || 0;
      const settled = item.settledQty || 0;
      const received = item.receivedQty || 0;
      const openShortageQty = Math.max(
        0,
        item.qty - received - settled - returned,
      );
      if (openShortageQty <= 0) return null;

      return {
        productId: item.productId,
        productCode: item.productCode,
        productName: item.productName,
        unit: item.unit,
        unitPrice: item.unitPrice,
        orderedQty: item.qty,
        receivedQty: received,
        openShortageQty,
        issueType: item.lastIssueType || PURCHASE_ISSUE_TYPES.SHORTAGE,
        issueNote: item.lastIssueNote || "",
        reportedDate:
          item.lastIssueDate || purchase.receivedDate || purchase.updatedAt,
      };
    })
    .filter(Boolean);

  const lastReportDate = items.reduce(
    (latest, i) => (!latest || i.reportedDate > latest ? i.reportedDate : latest),
    null,
  );

  return {
    purchaseId: purchase.id,
    invoiceNumber: purchase.invoiceNumber,
    invoiceDate: purchase.invoiceDate,
    supplierId: purchase.supplierId,
    supplierName: purchase.supplierName,
    receivedDate: purchase.receivedDate || "",
    receivingNote: purchase.receivingNote || "",
    transporterName: purchase.transporterName || "",
    items,
    totalOpenShortageQty: items.reduce((s, i) => s + i.openShortageQty, 0),
    lastReportDate,
  };
}

/**
 * لیست همه‌ی خریدهایی که هنوز کسری بازِ گزارش‌شده توسط انبار دارند
 * و مرجوعی فعالی به‌طور کامل آن را پوشش نداده است.
 */
export async function fetchShortageReports(params = {}) {
  await delay(400);
  const { search = "" } = params;

  let reports = allPurchases
    .map((purchase) => buildShortageReport(purchase))
    .filter((r) => r.items.length > 0);

  if (search) {
    const s = search.toLowerCase();
    reports = reports.filter(
      (r) =>
        r.invoiceNumber.toLowerCase().includes(s) ||
        r.supplierName.toLowerCase().includes(s),
    );
  }

  return reports.sort(
    (a, b) => new Date(b.lastReportDate || 0) - new Date(a.lastReportDate || 0),
  );
}

/**
 * گزارش کسری یک خریدِ مشخص — دقیقاً همان اطلاعاتی که برای پیش‌پرکردن
 * فرم ثبت مرجوعی استفاده می‌شود.
 */
export async function fetchShortageReportByPurchaseId(purchaseId) {
  await delay(300);
  const purchase = allPurchases.find(
    (p) => Number(p.id) === Number(purchaseId),
  );
  if (!purchase) throw new Error("خرید یافت نشد");

  const report = buildShortageReport(purchase);
  if (report.items.length === 0) {
    throw new Error("این خرید دیگر کسری قابل پیگیری ندارد");
  }
  return report;
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
    resolutionType: RESOLUTION_TYPES.NONE,
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

  const current = allPurchaseReturns[index];
  const next = { ...current, ...updates, updatedAt: new Date().toISOString() };
  allPurchaseReturns[index] = next;

  const justSettled =
    next.status === PURCHASE_RETURN_STATUSES.RESOLVED &&
    [RESOLUTION_TYPES.REFUND, RESOLUTION_TYPES.WRITE_OFF, RESOLUTION_TYPES.CREDIT].includes(
      next.resolutionType,
    ) &&
    current.status !== PURCHASE_RETURN_STATUSES.RESOLVED;

  if (justSettled) {
    const refundAmount =
      next.resolutionType === RESOLUTION_TYPES.REFUND
        ? Number(next.refundAmount) || 0
        : 0;
    await settlePurchaseItems(
      next.purchaseId,
      next.items.map((i) => ({ productId: i.productId, qty: i.qty })),
      { refundAmount },
    );
  }

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