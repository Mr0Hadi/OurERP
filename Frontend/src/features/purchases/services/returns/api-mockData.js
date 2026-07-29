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

// وضعیت‌هایی که هنوز به نتیجه‌ی نهایی نرسیده‌اند (برای محاسبه‌ی
// «چقدر دیگر از این محصول در انتظار تصمیم‌گیری/ارسال است»)
const NOT_YET_FINAL_RETURN_STATUSES = new Set([
  PURCHASE_RETURN_STATUSES.PENDING,
  PURCHASE_RETURN_STATUSES.COORDINATING,
  PURCHASE_RETURN_STATUSES.AWAITING_REFUND,
  PURCHASE_RETURN_STATUSES.AWAITING_REPLACEMENT,
]);

function getPurchase(purchaseId) {
  return allPurchases.find((p) => Number(p.id) === Number(purchaseId));
}

/** مجموع تعداد رزرو شده روی یک ردیف مشکل مشخص (issueId)، توسط مرجوعی‌های فعال */
function getReservedQtyForIssue(issueId, excludeReturnId = null) {
  let sum = 0;
  allPurchaseReturns.forEach((r) => {
    if (excludeReturnId && r.id === excludeReturnId) return;
    if (!ACTIVE_RETURN_STATUSES.has(r.status)) return;
    r.items.forEach((item) => {
      if (item.issueId === issueId) sum += item.qty;
    });
  });
  return sum;
}

/** مجموع تعداد رزرو شده روی یک محصول مشخص از یک خرید، توسط مرجوعی‌های
 * فعالی که هنوز به نتیجه‌ی نهایی نرسیده‌اند (برای تشخیص «آیا مرجوعیِ
 * در انتظار ارسال جایگزین دیگر تکمیل شده یا نه») */
function getReservedQtyByPendingReturns(purchaseId, productId, excludeReturnId = null) {
  let sum = 0;
  allPurchaseReturns.forEach((r) => {
    if (r.purchaseId !== purchaseId) return;
    if (excludeReturnId && r.id === excludeReturnId) return;
    if (!NOT_YET_FINAL_RETURN_STATUSES.has(r.status)) return;
    r.items.forEach((item) => {
      if (item.productId === productId) sum += item.qty;
    });
  });
  return sum;
}

/**
 * برای یک قلم خرید، ردیف‌های تاریخچه‌ی مشکل (item.issues) را به
 * «مقدار باز» تبدیل می‌کند. برای جلوگیری از دوبار شمردن (مثلاً وقتی
 * محموله‌ی جدید بخشی از کسریِ قدیمی را پوشش داده)، سقف کل بین همه‌ی
 * ردیف‌ها برابر با «باقیمانده‌ی واقعی این قلم» (qty - دریافتی - تسویه‌شده)
 * است؛ جدیدترین گزارش‌ها اولویت دارند (چون دقیق‌ترین تصویر فعلی‌اند).
 */
function distributeOpenQtyAcrossIssues(item) {
  let budget = Math.max(
    0,
    item.qty - (item.receivedQty || 0) - (item.settledQty || 0),
  );
  if (budget <= 0) return [];

  const sorted = [...(item.issues || [])].sort(
    (a, b) => new Date(b.date) - new Date(a.date),
  );

  const result = [];
  for (const entry of sorted) {
    if (budget <= 0) break;
    const claimAdjusted = Math.max(0, entry.qty - getReservedQtyForIssue(entry.id));
    const open = Math.min(claimAdjusted, budget);
    if (open > 0) {
      result.push({ ...entry, openQty: open });
      budget -= open;
    }
  }
  return result;
}

/**
 * ساخت «گزارش کسری» یک خرید مستقیماً از روی داده‌های واقعیِ ثبت‌شده
 * توسط انباردار. هر نوع مشکل هر قلم به‌صورت یک ردیف مجزا برمی‌گردد —
 * یعنی یک کالا می‌تواند هم‌زمان چند ردیف (مثلاً کسری + معیوب) داشته باشد.
 */
function buildShortageReport(purchase) {
  const lines = [];

  purchase.items.forEach((item) => {
    const distributed = distributeOpenQtyAcrossIssues(item);
    distributed.forEach((entry) => {
      lines.push({
        issueId: entry.id,
        productId: item.productId,
        productCode: item.productCode,
        productName: item.productName,
        unit: item.unit,
        unitPrice: item.unitPrice,
        orderedQty: item.qty,
        receivedQty: item.receivedQty || 0,
        openShortageQty: entry.openQty,
        issueType: entry.type,
        issueNote: entry.note,
        reportedDate: entry.date,
      });
    });
  });

  const lastReportDate = lines.reduce(
    (latest, l) => (!latest || l.reportedDate > latest ? l.reportedDate : latest),
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
    items: lines,
    totalOpenShortageQty: lines.reduce((s, l) => s + l.openShortageQty, 0),
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
 * تبدیل گزارش کسریِ یک خرید به یک ردیف «مجازی» شبیه به مرجوعی، برای
 * نمایش در همان لیست مرجوعی‌ها با وضعیت «قابل پیگیری». یک ردیف در
 * سطح هر خرید (نه هر نوع مشکل) تا فهرست شلوغ نشود؛ جزئیات تفکیک‌شده
 * (چند نوع مشکل) داخل صفحه‌ی ثبت مرجوعی دیده می‌شود.
 */
function toVirtualReturnEntry(report) {
  if (!report || report.items.length === 0) return null;

  const items = report.items.map((i) => ({
    issueId: i.issueId,
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

export async function fetchShortageReportByPurchaseId(purchaseId) {
  await delay(300);
  const purchase = getPurchase(purchaseId);
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
 *   مربوطه در خرید به‌طور دائم بسته می‌شوند.
 * - گذار به «در انتظار ارسال جایگزین» → خرید دوباره به وضعیت «ارسال
 *   شده» برمی‌گردد تا در لیست دریافتِ انباردار ظاهر شود.
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
 * پس از هر دور دریافت در انبار فراخوانی می‌شود. برای هر مرجوعیِ «در
 * انتظار ارسال جایگزین» این خرید (به ترتیب قدیمی‌ترین اول)، بررسی
 * می‌کند که آیا با احتساب دریافتی‌های تازه، دیگر چیزی از آن محصول
 * کم نیست (به‌جز سهم خودِ همین مرجوعی) — اگر بله، یعنی جایگزین رسیده
 * و مرجوعی به‌طور خودکار «تسویه‌شده» علامت می‌خورد.
 */
export function autoResolveReplacementReturns(purchaseId) {
  const purchase = getPurchase(purchaseId);
  if (!purchase) return;

  const candidates = allPurchaseReturns
    .filter(
      (r) =>
        r.purchaseId === purchaseId &&
        r.status === PURCHASE_RETURN_STATUSES.AWAITING_REPLACEMENT,
    )
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  candidates.forEach((ret) => {
    const idx = allPurchaseReturns.findIndex((r) => r.id === ret.id);
    if (idx === -1) return;

    const stillNeeded = ret.items.some((retItem) => {
      const purchaseItem = purchase.items.find(
        (pi) => pi.productId === retItem.productId,
      );
      if (!purchaseItem) return true;
      const reservedByOthers = getReservedQtyByPendingReturns(
        purchaseId,
        retItem.productId,
        ret.id,
      );
      const remaining =
        purchaseItem.qty -
        (purchaseItem.receivedQty || 0) -
        (purchaseItem.settledQty || 0) -
        reservedByOthers;
      return remaining > 0;
    });

    if (!stillNeeded) {
      allPurchaseReturns[idx] = {
        ...allPurchaseReturns[idx],
        status: PURCHASE_RETURN_STATUSES.RESOLVED,
        resolutionType: RESOLUTION_TYPES.REPLACEMENT,
        updatedAt: new Date().toISOString(),
      };
    }
  });
}