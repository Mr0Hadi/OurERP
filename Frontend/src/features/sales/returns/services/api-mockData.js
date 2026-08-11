import {
  allSalesReturns,
  SALES_RETURN_STATUSES,
  RESOLUTION_TYPES,
  RESOLUTION_LINE_STATUSES,
} from "./mockData";
import { allSales } from "@/features/sales/orders/services/mockData";
import { adjustProductsStock } from "@/features/warehouse/products/services/api-mockData";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const generateId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

const ACTIVE_RETURN_STATUSES = new Set([
  SALES_RETURN_STATUSES.PENDING_INSPECTION,
  SALES_RETURN_STATUSES.COORDINATING,
  SALES_RETURN_STATUSES.RESOLVED,
]);

const RETURN_ELIGIBLE_SALE_STATUSES = ["shipped", "delivered", "partially_delivered"];

function getSale(saleId) {
  return allSales.find((s) => Number(s.id) === Number(saleId));
}
export function getSalesReturnIndex(returnId) {
  return allSalesReturns.findIndex((r) => Number(r.id) === Number(returnId));
}

/**
 * چقدر از یک کالا، برای یک فروش مشخص، الان «رزرو» است — یعنی چیزی که
 * فعلاً دست مشتری نیست یا هنوز تکلیفش معلوم نشده، پس نباید دوباره
 * قابل مرجوع‌شدن باشد.
 *
 * نکته‌ی کلیدی: وقتی تصمیمِ یک خط، «ارسال کالای جایگزین» است و آن
 * جایگزین (کامل یا حتی بخشی) ارسال شده، آن مقدار دیگر رزرو نیست —
 * چون یک کالای فیزیکی تازه به‌جای کالای برگشتی به مشتری تحویل شده و
 * او دوباره می‌تواند (در صورت وجود مشکل) همان را مرجوع کند. برای
 * انواع دیگر تصمیم (بازگشت وجه، اعتبار خرید، بدون جبران) این اتفاق
 * نمی‌افتد چون هیچ کالای فیزیکی جدیدی دست مشتری نمی‌رسد، پس آن مقدار
 * برای همیشه رزرو باقی می‌ماند.
 */
function getReservedQtyForProduct(saleId, productId, excludeReturnId = null) {
  let reserved = 0;
  allSalesReturns.forEach((r) => {
    if (Number(r.saleId) !== Number(saleId)) return;
    if (excludeReturnId && r.id === excludeReturnId) return;
    if (!ACTIVE_RETURN_STATUSES.has(r.status)) return;

    r.items.forEach((item) => {
      if (item.productId !== productId) return;

      reserved += item.claimedQty || 0;

      (item.resolutions || []).forEach((res) => {
        if (res.type === RESOLUTION_TYPES.REPLACEMENT) {
          reserved -= res.shippedQty || 0;
        }
      });
    });
  });
  return Math.max(0, reserved);
}

export function computeItemReturnableQty(item, saleId, excludeReturnId = null) {
  const delivered = item.shippedQty ?? item.qty;
  const reserved = getReservedQtyForProduct(saleId, item.productId, excludeReturnId);
  return Math.max(0, delivered - reserved);
}

export async function fetchReturnableSales(search = "") {
  await delay(350);
  let filtered = allSales.filter((s) => RETURN_ELIGIBLE_SALE_STATUSES.includes(s.status));
  if (search) {
    const s = search.toLowerCase();
    filtered = filtered.filter(
      (sale) =>
        sale.invoiceNumber.toLowerCase().includes(s) ||
        sale.customerName.toLowerCase().includes(s),
    );
  }
  filtered.sort((a, b) => new Date(b.invoiceDate) - new Date(a.invoiceDate));
  return filtered.slice(0, 30).map((sale) => ({
    id: sale.id,
    invoiceNumber: sale.invoiceNumber,
    invoiceDate: sale.invoiceDate,
    customerId: sale.customerId,
    customerName: sale.customerName,
    status: sale.status,
    totalAmount: sale.totalAmount,
  }));
}

export async function fetchSaleForReturn(saleId) {
  await delay(300);
  const sale = getSale(saleId);
  if (!sale) throw new Error("فروش یافت نشد");
  if (!RETURN_ELIGIBLE_SALE_STATUSES.includes(sale.status)) {
    throw new Error("این فروش هنوز به مشتری تحویل نشده و قابل مرجوع‌کردن نیست");
  }

  const items = sale.items
    .map((item) => ({ ...item, returnableQty: computeItemReturnableQty(item, sale.id) }))
    .filter((item) => item.returnableQty > 0);

  return {
    saleId: sale.id,
    saleUpdatedAt: sale.updatedAt,
    invoiceNumber: sale.invoiceNumber,
    invoiceDate: sale.invoiceDate,
    customerId: sale.customerId,
    customerName: sale.customerName,
    items,
  };
}

function isFullyVerified(items) {
  return items.every((i) => (i.verifiedQty || 0) >= i.claimedQty);
}

export function computeReturnStatus(items) {
  if (!isFullyVerified(items)) return SALES_RETURN_STATUSES.PENDING_INSPECTION;

  const totalVerifiedQty = items.reduce((s, i) => s + (i.verifiedQty || 0), 0);
  const allLines = items.flatMap((i) => i.resolutions || []);
  const allocatedQty = allLines.reduce((s, l) => s + (Number(l.qty) || 0), 0);

  if (totalVerifiedQty === 0) return SALES_RETURN_STATUSES.COORDINATING;

  const allFinal =
    allLines.length > 0 && allLines.every((l) => l.status === RESOLUTION_LINE_STATUSES.RESOLVED);

  if (allocatedQty >= totalVerifiedQty && allFinal) return SALES_RETURN_STATUSES.RESOLVED;
  return SALES_RETURN_STATUSES.COORDINATING;
}

export async function fetchSalesReturns(params = {}) {
  await delay(500);
  const {
    page = 1, limit = 10, search = "", customerIds = [], status = "", reason = "",
    fromDate = "", toDate = "", sortBy = "createdAt", sortOrder = "desc",
  } = params;

  let filtered = [...allSalesReturns];
  if (search) {
    const s = search.toLowerCase();
    filtered = filtered.filter(
      (r) =>
        (r.returnNumber && r.returnNumber.toLowerCase().includes(s)) ||
        r.saleInvoiceNumber.toLowerCase().includes(s) ||
        r.customerName.toLowerCase().includes(s),
    );
  }
  if (Array.isArray(customerIds) && customerIds.length) {
    filtered = filtered.filter((r) => customerIds.map(String).includes(String(r.customerId)));
  }
  if (status) filtered = filtered.filter((r) => r.status === status);
  if (reason) filtered = filtered.filter((r) => r.reason === reason);
  if (fromDate) filtered = filtered.filter((r) => r.returnDate && r.returnDate.slice(0, 10) >= fromDate.slice(0, 10));
  if (toDate) filtered = filtered.filter((r) => r.returnDate && r.returnDate.slice(0, 10) <= toDate.slice(0, 10));

  filtered.sort((a, b) => {
    let aVal = a[sortBy];
    let bVal = b[sortBy];
    if (["createdAt", "updatedAt", "returnDate"].includes(sortBy)) {
      aVal = aVal ? new Date(aVal).getTime() : 0;
      bVal = bVal ? new Date(bVal).getTime() : 0;
    } else if (sortBy === "totalClaimedAmount") {
      aVal = Number(aVal) || 0;
      bVal = Number(bVal) || 0;
    } else if (typeof aVal === "string" || typeof bVal === "string") {
      aVal = aVal || "";
      bVal = bVal || "";
      return sortOrder === "asc" ? aVal.localeCompare(bVal, "fa") : bVal.localeCompare(aVal, "fa");
    }
    return sortOrder === "asc" ? (aVal > bVal ? 1 : -1) : aVal < bVal ? 1 : -1;
  });

  const total = filtered.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const start = (page - 1) * limit;
  const items = filtered.slice(start, start + limit);
  return { items, total, page, totalPages };
}

export async function fetchSalesReturnById(id) {
  await delay(300);
  const item = allSalesReturns.find((r) => Number(r.id) === Number(id));
  if (!item) throw new Error("مرجوعی یافت نشد");
  return item;
}

export async function createSalesReturn(payload) {
  await delay(700);
  const newId = allSalesReturns.length
    ? Math.max(...allSalesReturns.map((r) => Number(r.id) || 0)) + 1
    : 1;
  const returnNumber = `SRET-2026-${String(newId).padStart(3, "0")}`;

  const items = payload.items.map((i) => ({ ...i, verifiedQty: 0, issues: [], resolutions: [] }));
  const totalClaimedAmount = items.reduce((sum, i) => sum + i.lineTotal, 0);

  const newReturn = {
    id: newId,
    returnNumber,
    status: SALES_RETURN_STATUSES.PENDING_INSPECTION,
    ...payload,
    items,
    totalClaimedAmount,
    receivingNote: "",
    receivedDate: "",
    transporterName: "",
    transporterNationalId: "",
    vehiclePlate: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  allSalesReturns.unshift(newReturn);
  return newReturn;
}

function hasAnyPhysicalInspection(items) {
  return items.some((i) => (i.verifiedQty || 0) > 0);
}

export async function addItemResolution(returnId, lineId, resolution) {
  await delay(500);
  const idx = getSalesReturnIndex(returnId);
  if (idx === -1) throw new Error("مرجوعی یافت نشد");

  const ret = allSalesReturns[idx];
  if ([SALES_RETURN_STATUSES.REJECTED, SALES_RETURN_STATUSES.CANCELLED, SALES_RETURN_STATUSES.RESOLVED].includes(ret.status)) {
    throw new Error("این مرجوعی دیگر قابل ویرایش نیست");
  }

  const item = ret.items.find((i) => i.lineId === lineId);
  if (!item) throw new Error("قلم یافت نشد");
  if (!item.verifiedQty || item.verifiedQty <= 0) {
    throw new Error("هنوز چیزی از این قلم توسط انبار دریافت نشده است");
  }

  const allocated = (item.resolutions || []).reduce((s, r) => s + (Number(r.qty) || 0), 0);
  const remaining = item.verifiedQty - allocated;
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
    status: isReplacement ? RESOLUTION_LINE_STATUSES.AWAITING : RESOLUTION_LINE_STATUSES.RESOLVED,
    shippedQty: 0,
    shipmentHistory: [],
    createdAt: new Date().toISOString(),
    resolvedAt: isReplacement ? null : new Date().toISOString(),
  };

  const newItems = ret.items.map((i) =>
    i.lineId === lineId ? { ...i, resolutions: [...(i.resolutions || []), newLine] } : i,
  );

  allSalesReturns[idx] = {
    ...ret,
    items: newItems,
    status: computeReturnStatus(newItems),
    updatedAt: new Date().toISOString(),
  };
  return allSalesReturns[idx];
}

export async function removeItemResolution(returnId, lineId, resolutionId) {
  await delay(400);
  const idx = getSalesReturnIndex(returnId);
  if (idx === -1) throw new Error("مرجوعی یافت نشد");

  const ret = allSalesReturns[idx];
  const item = ret.items.find((i) => i.lineId === lineId);
  if (!item) throw new Error("قلم یافت نشد");

  const line = (item.resolutions || []).find((r) => r.id === resolutionId);
  if (!line) throw new Error("مورد یافت نشد");
  if (line.status !== RESOLUTION_LINE_STATUSES.AWAITING) {
    throw new Error("این تصمیم قطعی شده و دیگر قابل لغو نیست");
  }
  if ((line.shippedQty || 0) > 0) {
    throw new Error("بخشی از این کالای جایگزین قبلاً ارسال شده و دیگر قابل لغو نیست");
  }

  const newItems = ret.items.map((i) =>
    i.lineId === lineId
      ? { ...i, resolutions: (i.resolutions || []).filter((r) => r.id !== resolutionId) }
      : i,
  );

  allSalesReturns[idx] = {
    ...ret,
    items: newItems,
    status: computeReturnStatus(newItems),
    updatedAt: new Date().toISOString(),
  };
  return allSalesReturns[idx];
}

/**
 * ثبت ارسال (کامل یا بخشی) چند خط تصمیمِ «ارسال کالای جایگزین» به‌طور
 * هم‌زمان برای یک مرجوعی. هر قلم مستقل تجمعی حساب می‌شود.
 *
 * چون این عملیات یعنی یک کالای فیزیکی تازه از انبار خارج و به مشتری
 * تحویل داده می‌شود، موجودی هر محصول به‌اندازه‌ی مقداری که *در همین
 * دور* ارسال می‌شود (thisRoundQty) کم می‌شود — نه مقدار تجمعی کل خط
 * تصمیم، تا در ارسال چندمرحله‌ای موجودی دوبار کم نشود.
 */
export async function confirmReplacementShipmentBatch(returnId, shipmentData) {
  await delay(500);
  const idx = getSalesReturnIndex(returnId);
  if (idx === -1) throw new Error("مرجوعی یافت نشد");

  const ret = allSalesReturns[idx];
  const shippedDate = shipmentData.shippedDate || new Date().toISOString().slice(0, 10);
  const linesToShip = shipmentData.items || [];

  if (linesToShip.length === 0) {
    throw new Error("هیچ کالایی برای ثبت ارسال انتخاب نشده است");
  }

  const stockDecreases = [];

  const newItems = ret.items.map((item) => {
    const shipEntry = linesToShip.find((l) => l.lineId === item.lineId);
    if (!shipEntry) return item;

    const newResolutions = (item.resolutions || []).map((r) => {
      if (r.id !== shipEntry.resolutionId) return r;
      if (r.type !== RESOLUTION_TYPES.REPLACEMENT) return r;
      if (r.status === RESOLUTION_LINE_STATUSES.RESOLVED) return r;

      const prevShipped = r.shippedQty || 0;
      const remaining = r.qty - prevShipped;
      const thisRoundQty = Math.max(0, Math.min(Number(shipEntry.shippedQtyThisRound) || 0, remaining));
      if (thisRoundQty <= 0) return r;

      const newShippedQty = prevShipped + thisRoundQty;
      const isFullyShipped = newShippedQty >= r.qty;

      stockDecreases.push({ productId: item.productId, delta: -thisRoundQty });

      return {
        ...r,
        shippedQty: newShippedQty,
        status: isFullyShipped ? RESOLUTION_LINE_STATUSES.RESOLVED : RESOLUTION_LINE_STATUSES.AWAITING,
        resolvedAt: isFullyShipped ? new Date().toISOString() : null,
        shipmentHistory: [
          ...(r.shipmentHistory || []),
          {
            id: generateId(),
            date: shippedDate,
            qty: thisRoundQty,
            driverName: shipmentData.driverName || "",
            driverNationalId: shipmentData.driverNationalId || "",
            vehiclePlate: shipmentData.vehiclePlate || "",
            note: shipmentData.shippingNote || "",
          },
        ],
      };
    });

    return { ...item, resolutions: newResolutions };
  });

  allSalesReturns[idx] = {
    ...ret,
    items: newItems,
    status: computeReturnStatus(newItems),
    updatedAt: new Date().toISOString(),
  };

  adjustProductsStock(stockDecreases);

  return allSalesReturns[idx];
}

export async function rejectSalesReturn(id) {
  await delay(300);
  const idx = getSalesReturnIndex(id);
  if (idx === -1) throw new Error("مرجوعی یافت نشد");
  const ret = allSalesReturns[idx];
  if (ret.status !== SALES_RETURN_STATUSES.PENDING_INSPECTION || hasAnyPhysicalInspection(ret.items)) {
    throw new Error("فقط مرجوعی‌هایی که هنوز هیچ بخشی از آن‌ها بررسی نشده، قابل رد کردن‌اند");
  }
  allSalesReturns[idx] = { ...ret, status: SALES_RETURN_STATUSES.REJECTED, updatedAt: new Date().toISOString() };
  return allSalesReturns[idx];
}

export async function cancelSalesReturn(id) {
  await delay(300);
  const idx = getSalesReturnIndex(id);
  if (idx === -1) throw new Error("مرجوعی یافت نشد");
  const ret = allSalesReturns[idx];
  if (ret.status !== SALES_RETURN_STATUSES.PENDING_INSPECTION || hasAnyPhysicalInspection(ret.items)) {
    throw new Error("فقط مرجوعی‌هایی که هنوز هیچ بخشی از آن‌ها بررسی نشده، قابل لغو کردن‌اند");
  }
  allSalesReturns[idx] = { ...ret, status: SALES_RETURN_STATUSES.CANCELLED, updatedAt: new Date().toISOString() };
  return allSalesReturns[idx];
}

export async function reopenSalesReturn(id) {
  await delay(300);
  const idx = getSalesReturnIndex(id);
  if (idx === -1) throw new Error("مرجوعی یافت نشد");
  const ret = allSalesReturns[idx];
  if (ret.status !== SALES_RETURN_STATUSES.REJECTED) return ret;
  allSalesReturns[idx] = { ...ret, status: SALES_RETURN_STATUSES.PENDING_INSPECTION, updatedAt: new Date().toISOString() };
  return allSalesReturns[idx];
}

export async function removeSalesReturn(id) {
  await delay(500);
  const idx = getSalesReturnIndex(id);
  if (idx === -1) throw new Error("مرجوعی یافت نشد");
  const removed = allSalesReturns.splice(idx, 1)[0];
  return removed;
}