// src/features/purchases/services/returns/api-mockData.js
import {
  allPurchaseReturns,
  PURCHASE_RETURN_STATUSES,
  RESOLUTION_TYPES,
} from "./mockData";
import { allPurchases } from "@/features/purchases/services/mockData";
import {
  settlePurchaseItems,
  reopenPurchaseForShipment,
} from "@/features/purchases/services/api-mockData";
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
 * نه از یک فرم جداگانه. این تابع منبع واحد حقیقت هم برای ردیف‌های
 * «قابل پیگیری» در لیست مرجوعی‌ها و هم برای فرم ثبت مرجوعی است.
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

function mostFrequentReason(values) {
  if (!values.length) return PURCHASE_ISSUE_TYPES.OTHER;
  const counts = new Map();
  values.forEach((v) => counts.set(v, (counts.get(v) || 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

/**
 * یک گزارش کسری را به شکل یک ردیف «مجازی» شبیه به مرجوعی درمی‌آورد تا
 * بتوان آن را در همان جدول مرجوعی‌ها، کنار مرجوعی‌های واقعی، نمایش داد.
 * این ردیف‌ها در دیتابیس ذخیره نمی‌شوند و هر بار از روی وضعیت لحظه‌ای
 * خرید محاسبه می‌شوند.
 */
function toVirtualReturnEntry(report) {
  if (!report || report.items.length === 0) return null;

  const items = report.items.map((i) => ({
    productId: i.productId,
    productCode: i.productCode,
    productName: i.productName,
    unit: i.unit,
    qty: i.openShortageQty,
    unitPrice: i.unitPrice,
    lineTotal: i.openShortageQty * i.unitPrice,
    reason: i.issueType,
    note: i.issueNote,
  }));

  return {
    id: `report-${report.purchaseId}`,
    isVirtual: true,
    returnNumber: null,
    purchaseId: report.purchaseId,
    purchaseInvoiceNumber: report.invoiceNumber,
    supplierId: report.supplierId,
    supplierName: report.supplierName,
    returnDate: report.lastReportDate,
    reason: mostFrequentReason(items.map((i) => i.reason)),
    status: PURCHASE_RETURN_STATUSES.TRACKABLE,
    resolutionType: RESOLUTION_TYPES.NONE,
    items,
    totalAmount: items.reduce((s, i) => s + i.lineTotal, 0),
    refundAmount: 0,
    description: "",
    createdAt: report.lastReportDate || new Date().toISOString(),
    updatedAt: report.lastReportDate || new Date().toISOString(),
  };
}

function getAllTrackableEntries() {
  return allPurchases
    .map((purchase) => toVirtualReturnEntry(buildShortageReport(purchase)))
    .filter(Boolean);
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

/**
 * لیست ترکیبیِ مرجوعی‌های واقعی + ردیف‌های «قابل پیگیری» (کسری‌های
 * گزارش‌شده توسط انبار که هنوز مرجوعی رسمی ندارند). هر دو دسته با هم
 * فیلتر، جست‌وجو، مرتب‌سازی و صفحه‌بندی می‌شوند تا کاربر یک تجربه‌ی
 * واحد داشته باشد.
 */
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

  let combined = [...allPurchaseReturns, ...getAllTrackableEntries()];

  if (search) {
    const s = search.toLowerCase();
    combined = combined.filter(
      (r) =>
        (r.returnNumber && r.returnNumber.toLowerCase().includes(s)) ||
        r.purchaseInvoiceNumber.toLowerCase().includes(s) ||
        r.supplierName.toLowerCase().includes(s),
    );
  }
  if (Array.isArray(supplierIds) && supplierIds.length) {
    combined = combined.filter((r) =>
      supplierIds.map(String).includes(String(r.supplierId)),
    );
  }
  if (status) combined = combined.filter((r) => r.status === status);
  if (reason) combined = combined.filter((r) => r.reason === reason);
  if (fromDate) {
    combined = combined.filter(
      (r) => r.returnDate && r.returnDate.slice(0, 10) >= fromDate.slice(0, 10),
    );
  }
  if (toDate) {
    combined = combined.filter(
      (r) => r.returnDate && r.returnDate.slice(0, 10) <= toDate.slice(0, 10),
    );
  }

  combined.sort((a, b) => {
    let aVal = a[sortBy];
    let bVal = b[sortBy];

    if (["createdAt", "updatedAt", "returnDate"].includes(sortBy)) {
      aVal = aVal ? new Date(aVal).getTime() : 0;
      bVal = bVal ? new Date(bVal).getTime() : 0;
    } else if (sortBy === "totalAmount") {
      aVal = Number(aVal) || 0;
      bVal = Number(bVal) || 0;
    } else if (typeof aVal === "string" || typeof bVal === "string") {
      aVal = aVal || "";
      bVal = bVal || "";
      return sortOrder === "asc"
        ? aVal.localeCompare(bVal, "fa")
        : bVal.localeCompare(aVal, "fa");
    }

    return sortOrder === "asc" ? (aVal > bVal ? 1 : -1) : aVal < bVal ? 1 : -1;
  });

  const total = combined.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const start = (page - 1) * limit;
  const items = combined.slice(start, start + limit);

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

/**
 * به‌روزرسانی مرجوعی + اعمال اثرات جانبی روی خرید مبدا:
 * - گذار به «تسویه‌شده» با بازگشت‌وجه/پذیرش‌زیان/اعتبار → قلم‌های
 *   مربوطه در خرید به‌طور دائم بسته می‌شوند (settlePurchaseItems).
 * - گذار به «در انتظار ارسال جایگزین» → خرید دوباره به وضعیت «ارسال
 *   شده» برمی‌گردد تا در لیست دریافتِ انباردار ظاهر شود
 *   (reopenPurchaseForShipment).
 */
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

  const justScheduledReplacement =
    next.status === PURCHASE_RETURN_STATUSES.AWAITING_REPLACEMENT &&
    current.status !== PURCHASE_RETURN_STATUSES.AWAITING_REPLACEMENT;

  if (justScheduledReplacement) {
    await reopenPurchaseForShipment(next.purchaseId);
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

/**
 * پس از هر دور دریافت در انبار فراخوانی می‌شود. اگر مرجوعی‌ای با
 * وضعیت «در انتظار ارسال جایگزین» برای این خرید وجود داشته باشد و
 * تمام اقلام آن با این دریافت به‌طور کامل پوشش داده شده باشند
 * (کسری بازی نمانده باشد)، آن مرجوعی به‌طور خودکار به «تسویه‌شده»
 * تغییر می‌کند — بدون هیچ اقدام دستی از سمت واحد خرید.
 */
export function autoResolveReplacementReturns(purchaseId, updatedPurchaseItems) {
  const itemMap = new Map(updatedPurchaseItems.map((i) => [i.productId, i]));

  allPurchaseReturns.forEach((ret, idx) => {
    if (ret.purchaseId !== purchaseId) return;
    if (ret.status !== PURCHASE_RETURN_STATUSES.AWAITING_REPLACEMENT) return;

    const allDelivered = ret.items.every((retItem) => {
      const purchaseItem = itemMap.get(retItem.productId);
      if (!purchaseItem) return false;
      const openShortage =
        purchaseItem.qty -
        (purchaseItem.receivedQty || 0) -
        (purchaseItem.settledQty || 0);
      return openShortage <= 0;
    });

    if (allDelivered) {
      allPurchaseReturns[idx] = {
        ...ret,
        status: PURCHASE_RETURN_STATUSES.RESOLVED,
        resolutionType: RESOLUTION_TYPES.REPLACEMENT,
        updatedAt: new Date().toISOString(),
      };
    }
  });
}