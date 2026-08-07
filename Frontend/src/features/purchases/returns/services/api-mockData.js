// src/features/purchases/services/returns/api-mockData.js
import {
  allPurchaseReturns,
  PURCHASE_RETURN_STATUSES,
  RESOLUTION_TYPES,
  RESOLUTION_LINE_STATUSES,
} from "./mockData";
import { allPurchases } from "@/features/purchases/orders/services/mockData";
import {
  settlePurchaseItems,
  reopenPurchaseForShipment,
  recomputePurchaseStatus,
} from "@/features/purchases/orders/services/api-mockData";
import { PURCHASE_ISSUE_TYPES } from "@/shared/constants/purchaseIssueTypes";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const generateId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

// وضعیت‌هایی که یک مرجوعی هنوز روی «سهمیه‌ی کسری» یا محاسبات باز
// اثر می‌گذارند — رد/لغو باعث آزادشدن دوباره‌ی سهمیه می‌شوند
const ACTIVE_RETURN_STATUSES = new Set([
  PURCHASE_RETURN_STATUSES.PENDING,
  PURCHASE_RETURN_STATUSES.COORDINATING,
  PURCHASE_RETURN_STATUSES.RESOLVED,
]);
const TERMINAL_RETURN_STATUSES = new Set([
  PURCHASE_RETURN_STATUSES.REJECTED,
  PURCHASE_RETURN_STATUSES.CANCELLED,
]);

function getPurchase(purchaseId) {
  return allPurchases.find((p) => Number(p.id) === Number(purchaseId));
}
function getReturnIndex(returnId) {
  return allPurchaseReturns.findIndex((r) => Number(r.id) === Number(returnId));
}

/**
 * هر ردیف مرجوعی که از تقسیم یک کالا بین چند دلیل ساخته شده، یک
 * issueId تازه دارد ولی پیوند خودش با مشکل واقعیِ گزارش‌شده‌ی انبار را
 * در sourceIssueId نگه می‌دارد. برای ردیف‌های قدیمی (که این فیلد را
 * ندارند) issueId خودش همان مشکل اصلی است.
 */
function getReservedQtyForIssue(issueId, excludeReturnId = null) {
  let sum = 0;
  allPurchaseReturns.forEach((r) => {
    if (excludeReturnId && r.id === excludeReturnId) return;
    if (!ACTIVE_RETURN_STATUSES.has(r.status)) return;
    r.items.forEach((item) => {
      const linkedIssueId = item.sourceIssueId ?? item.issueId;
      if (linkedIssueId === issueId) sum += item.qty;
    });
  });
  return sum;
}

function computeReturnStatus(items) {
  const totalQty = items.reduce((s, i) => s + i.qty, 0);
  const allLines = items.flatMap((i) => i.resolutions || []);
  const allocatedQty = allLines.reduce((s, l) => s + (Number(l.qty) || 0), 0);

  if (allocatedQty === 0) return PURCHASE_RETURN_STATUSES.PENDING;

  const allFinal =
    allLines.length > 0 &&
    allLines.every((l) => l.status === RESOLUTION_LINE_STATUSES.RESOLVED);

  if (allocatedQty >= totalQty && allFinal) return PURCHASE_RETURN_STATUSES.RESOLVED;
  return PURCHASE_RETURN_STATUSES.COORDINATING;
}

/**
 * چقدر از یک ردیف «مشکل گزارش‌شده» هنوز واقعاً «باز و تصمیم‌گیری‌نشده»
 * است — یعنی نه هیچ مرجوعی‌ای برایش ساخته شده، و اگر ساخته شده، هنوز
 * هیچ تصمیمی (بازگشت وجه/جایگزینی/زیان/اعتبار) برای آن ثبت نشده.
 * این دقیقاً همان مقداری است که تا وقتی واحد خرید تصمیم نگیرد، نباید
 * دوباره به‌عنوان «قابل دریافت» به انباردار نشان داده شود.
 */
function getOpenIssueQtyForItem(item, purchaseId) {
  let total = 0;

  (item.issues || []).forEach((issue) => {
    const reservedFull = getReservedQtyForIssue(issue.id);
    // بخشی از این مشکل که هیچ مرجوعی‌ای هنوز آن را claim نکرده
    total += Math.max(0, issue.qty - reservedFull);

    // بخشی از این مشکل که مرجوعی برایش ساخته شده ولی هنوز هیچ
    // تصمیمی (resolution) برایش ثبت نشده — یعنی «در صف تصمیم‌گیری»
    allPurchaseReturns.forEach((ret) => {
      if (ret.purchaseId !== purchaseId) return;
      if (TERMINAL_RETURN_STATUSES.has(ret.status)) return;
      ret.items.forEach((retItem) => {
        const linkedIssueId = retItem.sourceIssueId ?? retItem.issueId;
        if (linkedIssueId !== issue.id) return;
        const decided = (retItem.resolutions || []).reduce(
          (s, r) => s + (Number(r.qty) || 0),
          0,
        );
        total += Math.max(0, retItem.qty - decided);
      });
    });
  });

  return total;
}

/**
 * چقدر از یک قلم خرید *الان* واقعاً «قابل دریافت» است — یعنی چیزی که
 * انباردار می‌تواند در دور بعدی دریافت، بدون نیاز به دخالت واحد خرید،
 * ثبت کند. این شامل هم «باقیمانده‌ی معمولی سفارش که هنوز هیچ مشکلی
 * برایش گزارش نشده» (مثلاً محموله‌ی بعدی همان کامیون) و هم «مقداری
 * که تصمیم گرفته شده جایگزین ارسال شود» می‌شود — و به‌طور خودکار
 * مقداری که هنوز به‌عنوان «مشکل بازِ تصمیم‌گیری‌نشده» مانده را کنار
 * می‌گذارد.
 */
export function computeItemReceivableQty(item, purchaseId) {
  const budget = Math.max(
    0,
    item.qty - (item.receivedQty || 0) - (item.settledQty || 0),
  );
  const openIssueQty = getOpenIssueQtyForItem(item, purchaseId);
  return Math.max(0, budget - openIssueQty);
}

export function computeHasAnyReceivableQty(purchase) {
  return purchase.items.some(
    (item) => computeItemReceivableQty(item, purchase.id) > 0,
  );
}

/**
 * تنها نقطه‌ای که وضعیت کلی خرید را — با دیدن کامل تمام آیتم‌ها و
 * تمام مرجوعی‌های فعال آن، نه فقط رویداد فعلی — نهایی می‌کند. باید
 * بعد از هر اکشنی که ممکن است روی نیاز به دریافت مجدد اثر بگذارد صدا
 * زده شود (ثبت تصمیم، حذف تصمیم، دریافت انبار).
 */
async function syncPurchaseStatusForReturns(purchaseId) {
  const purchase = getPurchase(purchaseId);
  if (!purchase) return;
  const hasReceivableQty = computeHasAnyReceivableQty(purchase);
  await recomputePurchaseStatus(purchaseId, { hasReceivableQty });
}

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
    // این فیلد برای شناسایی «آیا داده‌ی این گزارش هنوز تازه است؟» در
    // فرم ثبت مرجوعی استفاده می‌شود؛ هر تغییری روی خرید (دور جدید
    // دریافت، مشکل جدید، تصمیم جدید) این مقدار را عوض می‌کند.
    purchaseUpdatedAt: purchase.updatedAt,
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
    resolutions: [],
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
    items,
    totalAmount: items.reduce((s, i) => s + i.lineTotal, 0),
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

function withRoundInfo(list) {
  const sorted = [...list].sort(
    (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
  );
  const totalsByPurchase = new Map();
  sorted.forEach((r) => {
    totalsByPurchase.set(r.purchaseId, (totalsByPurchase.get(r.purchaseId) || 0) + 1);
  });
  const counters = new Map();
  return sorted.map((r) => {
    const count = (counters.get(r.purchaseId) || 0) + 1;
    counters.set(r.purchaseId, count);
    return {
      ...r,
      roundNumber: count,
      totalRoundsForPurchase: totalsByPurchase.get(r.purchaseId),
    };
  });
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

  let combined = withRoundInfo([...allPurchaseReturns, ...getAllTrackableEntries()]);

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

  const items = payload.items.map((i) => ({ ...i, resolutions: [] }));
  const totalAmount = items.reduce((sum, i) => sum + i.lineTotal, 0);

  const newReturn = {
    id: newId,
    returnNumber,
    status: PURCHASE_RETURN_STATUSES.PENDING,
    supplierResponseNote: "",
    ...payload,
    items,
    totalAmount,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  allPurchaseReturns.unshift(newReturn);
  return newReturn;
}

/**
 * ثبت یک «خط تصمیم» برای بخشی از یک قلم مرجوعی. یک قلم می‌تواند چندین
 * بار فراخوانی این تابع را ببیند تا کل مقدارش بین انواع مختلف تصمیم
 * تقسیم شود. در پایانِ *هر* فراخوانی — فارغ از نوع تصمیم — وضعیت خرید
 * با دیدن کل تصویر دوباره محاسبه می‌شود؛ همین رفتار باعث می‌شود ترتیب
 * یا ترکیب تصمیم‌ها (اول جایگزینی سپس بازگشت وجه، یا برعکس) هرگز
 * نتیجه‌ی همدیگر را خراب نکنند.
 */
export async function addItemResolution(returnId, issueId, resolution) {
  await delay(500);
  const idx = getReturnIndex(returnId);
  if (idx === -1) throw new Error("مرجوعی یافت نشد");

  const ret = allPurchaseReturns[idx];
  if (
    [
      PURCHASE_RETURN_STATUSES.REJECTED,
      PURCHASE_RETURN_STATUSES.CANCELLED,
      PURCHASE_RETURN_STATUSES.RESOLVED,
    ].includes(ret.status)
  ) {
    throw new Error("این مرجوعی دیگر قابل ویرایش نیست");
  }

  const item = ret.items.find((i) => i.issueId === issueId);
  if (!item) throw new Error("قلم یافت نشد");

  const allocated = (item.resolutions || []).reduce(
    (s, r) => s + (Number(r.qty) || 0),
    0,
  );
  const remaining = item.qty - allocated;
  const qty = Math.min(Number(resolution.qty) || 0, remaining);
  if (qty <= 0) throw new Error("تعداد وارد شده نامعتبر است");

  const isReplacement = resolution.type === RESOLUTION_TYPES.REPLACEMENT;
  const refundAmount =
    resolution.type === RESOLUTION_TYPES.REFUND
      ? Number(resolution.refundAmount) || qty * item.unitPrice
      : 0;

  const newLine = {
    id: generateId(),
    type: resolution.type,
    qty,
    refundAmount,
    note: resolution.note || "",
    status: isReplacement
      ? RESOLUTION_LINE_STATUSES.AWAITING
      : RESOLUTION_LINE_STATUSES.RESOLVED,
    createdAt: new Date().toISOString(),
    resolvedAt: isReplacement ? null : new Date().toISOString(),
  };

  const newItems = ret.items.map((i) =>
    i.issueId === issueId
      ? { ...i, resolutions: [...(i.resolutions || []), newLine] }
      : i,
  );

  allPurchaseReturns[idx] = {
    ...ret,
    items: newItems,
    status: computeReturnStatus(newItems),
    updatedAt: new Date().toISOString(),
  };

  if (isReplacement) {
    await reopenPurchaseForShipment(ret.purchaseId);
  } else {
    await settlePurchaseItems(
      ret.purchaseId,
      [{ productId: item.productId, qty }],
      { refundAmount },
    );
  }

  await syncPurchaseStatusForReturns(ret.purchaseId);

  return allPurchaseReturns[idx];
}

export async function removeItemResolution(returnId, issueId, resolutionId) {
  await delay(400);
  const idx = getReturnIndex(returnId);
  if (idx === -1) throw new Error("مرجوعی یافت نشد");

  const ret = allPurchaseReturns[idx];
  const item = ret.items.find((i) => i.issueId === issueId);
  if (!item) throw new Error("قلم یافت نشد");

  const line = (item.resolutions || []).find((r) => r.id === resolutionId);
  if (!line) throw new Error("مورد یافت نشد");
  if (line.status !== RESOLUTION_LINE_STATUSES.AWAITING) {
    throw new Error("این تصمیم قطعی شده و دیگر قابل لغو نیست");
  }

  const newItems = ret.items.map((i) =>
    i.issueId === issueId
      ? {
          ...i,
          resolutions: (i.resolutions || []).filter((r) => r.id !== resolutionId),
        }
      : i,
  );

  allPurchaseReturns[idx] = {
    ...ret,
    items: newItems,
    status: computeReturnStatus(newItems),
    updatedAt: new Date().toISOString(),
  };

  await syncPurchaseStatusForReturns(ret.purchaseId);

  return allPurchaseReturns[idx];
}

export async function rejectPurchaseReturn(id) {
  await delay(300);
  const idx = getReturnIndex(id);
  if (idx === -1) throw new Error("مرجوعی یافت نشد");
  const ret = allPurchaseReturns[idx];
  if (ret.status !== PURCHASE_RETURN_STATUSES.PENDING) {
    throw new Error("فقط مرجوعی‌های بدون تصمیم ثبت‌شده قابل رد کردن‌اند");
  }
  allPurchaseReturns[idx] = {
    ...ret,
    status: PURCHASE_RETURN_STATUSES.REJECTED,
    updatedAt: new Date().toISOString(),
  };
  await syncPurchaseStatusForReturns(ret.purchaseId);
  return allPurchaseReturns[idx];
}

export async function cancelPurchaseReturn(id) {
  await delay(300);
  const idx = getReturnIndex(id);
  if (idx === -1) throw new Error("مرجوعی یافت نشد");
  const ret = allPurchaseReturns[idx];
  if (ret.status !== PURCHASE_RETURN_STATUSES.PENDING) {
    throw new Error("فقط مرجوعی‌های بدون تصمیم ثبت‌شده قابل لغو کردن‌اند");
  }
  allPurchaseReturns[idx] = {
    ...ret,
    status: PURCHASE_RETURN_STATUSES.CANCELLED,
    updatedAt: new Date().toISOString(),
  };
  await syncPurchaseStatusForReturns(ret.purchaseId);
  return allPurchaseReturns[idx];
}

export async function reopenPurchaseReturn(id) {
  await delay(300);
  const idx = getReturnIndex(id);
  if (idx === -1) throw new Error("مرجوعی یافت نشد");
  const ret = allPurchaseReturns[idx];
  if (ret.status !== PURCHASE_RETURN_STATUSES.REJECTED) return ret;
  allPurchaseReturns[idx] = {
    ...ret,
    status: computeReturnStatus(ret.items),
    updatedAt: new Date().toISOString(),
  };
  await syncPurchaseStatusForReturns(ret.purchaseId);
  return allPurchaseReturns[idx];
}

export async function removePurchaseReturn(id) {
  await delay(500);
  const idx = getReturnIndex(id);
  if (idx === -1) throw new Error("مرجوعی یافت نشد");
  const removed = allPurchaseReturns.splice(idx, 1)[0];
  await syncPurchaseStatusForReturns(removed.purchaseId);
  return removed;
}

/**
 * پس از هر دور دریافت در انبار فراخوانی می‌شود. برای هر محصولی که
 * خطوط تصمیمِ «جایگزینی در انتظار» دارد — از هر تعداد مرجوعی/دوره/
 * محموله‌ی مختلف که باشد — بررسی می‌کند چقدر از مقدار تازه‌رسیده به
 * کدام خط تعلق می‌گیرد (قدیمی‌ترین خط اول، مثل صف FIFO؛ این دقیقاً
 * پاسخ به سناریوی «کسریِ محموله‌ی اول همراه محموله‌ی دوم می‌رسد» است)
 * و در صورت پوشش کامل، آن خط را «نهایی» می‌کند.
 *
 * در پایان، وضعیت خرید — برای تمام مرجوعی‌های این خرید، نه فقط
 * همینی که همین الان بسته شد — با تابع مرکزی بازمحاسبه می‌شود.
 */
export async function autoResolveReplacementReturns(purchaseId) {
  const purchase = getPurchase(purchaseId);
  if (!purchase) return;

  const awaitingLines = [];
  allPurchaseReturns.forEach((ret) => {
    if (ret.purchaseId !== purchaseId) return;
    if (TERMINAL_RETURN_STATUSES.has(ret.status)) return;
    ret.items.forEach((item) => {
      (item.resolutions || []).forEach((res) => {
        if (
          res.type === RESOLUTION_TYPES.REPLACEMENT &&
          res.status === RESOLUTION_LINE_STATUSES.AWAITING
        ) {
          awaitingLines.push({ productId: item.productId, res });
        }
      });
    });
  });

  const productIds = [...new Set(awaitingLines.map((l) => l.productId))];

  productIds.forEach((productId) => {
    const purchaseItem = purchase.items.find((pi) => pi.productId === productId);
    if (!purchaseItem) return;

    const linesForProduct = awaitingLines
      .filter((l) => l.productId === productId)
      .map((l) => l.res)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    const totalAwaitingQty = linesForProduct.reduce(
      (s, l) => s + (Number(l.qty) || 0),
      0,
    );
    const stillNeeded = Math.max(
      0,
      purchaseItem.qty - (purchaseItem.receivedQty || 0) - (purchaseItem.settledQty || 0),
    );
    let coveredBudget = Math.max(0, totalAwaitingQty - stillNeeded);

    for (const line of linesForProduct) {
      if (coveredBudget >= line.qty) {
        line.status = RESOLUTION_LINE_STATUSES.RESOLVED;
        line.resolvedAt = new Date().toISOString();
        coveredBudget -= line.qty;
      } else {
        break;
      }
    }
  });

  allPurchaseReturns.forEach((ret, idx) => {
    if (ret.purchaseId !== purchaseId) return;
    if (TERMINAL_RETURN_STATUSES.has(ret.status)) return;
    allPurchaseReturns[idx] = {
      ...ret,
      status: computeReturnStatus(ret.items),
      updatedAt: new Date().toISOString(),
    };
  });

  await syncPurchaseStatusForReturns(purchaseId);
}