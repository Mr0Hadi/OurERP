import { allSales, SALE_STATUSES, SALE_STATUS_LABELS } from "./mockData";
import { SHIPPING_ELIGIBLE_STATUSES } from "./constants";
import { markUnitsShipped } from "@/features/warehouse/units/services/api-mockData";
import { allSalesReturns } from "@/features/sales/returns/services/mockData";
import { executeGoodsRound as executeSalesReturnRound } from "@/features/sales/returns/services/api-mockData";
import { buildGoodsLines } from "@/shared/domain/returns/resolutions";
import { EFFECT_KINDS } from "@/shared/domain/returns/effects";
import { SHIPPING_SOURCES } from "./shippingSources";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const generateId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export { SHIPPING_ELIGIBLE_STATUSES };

export const SHIPPING_STATUS_LABELS = Object.fromEntries(
  Object.entries(SALE_STATUS_LABELS).filter(([key]) =>
    SHIPPING_ELIGIBLE_STATUSES.includes(key),
  ),
);

/**
 * چقدر از یک قلم فروش هنوز واقعاً «قابل ارسال» است. اگر محصول قبلاً
 * (در دورهای قبلی ارسال) بخشی رسیده باشد، فقط باقیمانده را برمی‌گرداند
 * — همین باعث می‌شود ارسال چندمرحله‌ای (چند محموله/چند ماشین) به‌طور
 * طبیعی کار کند.
 */
export function computeItemShippableQty(item) {
  return Math.max(0, (item.qty || 0) - (item.shippedQty || 0));
}

export function computeHasAnyShippableQty(sale) {
  return sale.items.some((item) => computeItemShippableQty(item) > 0);
}

export async function fetchShippingSales(params = {}) {
  await delay(500);

  const {
    page = 1,
    limit = 10,
    search = "",
    customerIds = [],
    status = "",
    paymentType = "",
    fromDate = "",
    toDate = "",
    sortBy = "createdAt",
    sortOrder = "desc",
  } = params;

  let filtered = allSales.filter((s) =>
    SHIPPING_ELIGIBLE_STATUSES.includes(s.status),
  );

  if (search) {
    const searchLower = search.toLowerCase();
    filtered = filtered.filter(
      (s) =>
        s.invoiceNumber.toLowerCase().includes(searchLower) ||
        s.customerName.toLowerCase().includes(searchLower) ||
        (s.description && s.description.toLowerCase().includes(searchLower)),
    );
  }

  if (Array.isArray(customerIds) && customerIds.length > 0) {
    filtered = filtered.filter((s) => customerIds.includes(s.customerId));
  }

  if (status) {
    filtered = filtered.filter((s) => s.status === status);
  }

  if (paymentType) {
    filtered = filtered.filter((s) => s.paymentType === paymentType);
  }

  if (fromDate) {
    filtered = filtered.filter(
      (s) => s.invoiceDate && s.invoiceDate.slice(0, 10) >= fromDate.slice(0, 10),
    );
  }
  if (toDate) {
    filtered = filtered.filter(
      (s) => s.invoiceDate && s.invoiceDate.slice(0, 10) <= toDate.slice(0, 10),
    );
  }

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

    if (sortOrder === "asc") return aVal > bVal ? 1 : -1;
    return aVal < bVal ? 1 : -1;
  });

  const total = filtered.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const start = (page - 1) * limit;
  const items = filtered.slice(start, start + limit);

  return { items, total, page, totalPages };
}

/**
 * علاوه بر خودِ فروش، هر قلم را با shippableQty (باقیمانده‌ی واقعیِ
 * قابل ارسال) enrich می‌کند. فرم آماده‌سازی مرسوله باید فقط از همین
 * مقدار استفاده کند.
 */
export async function fetchShippingSaleById(id) {
  await delay(300);

  const sale = allSales.find((s) => Number(s.id) === Number(id));
  if (!sale) throw new Error("فروش یافت نشد");

  return {
    ...sale,
    items: sale.items.map((item) => ({
      ...item,
      shippableQty: computeItemShippableQty(item),
    })),
    // کالای جایگزینی که بابت مرجوعی‌های همین فروش به مشتری بدهکاریم.
    // با همین حواله می‌رود چون فیزیکاً همان ماشین است.
    returnLines: pendingReturnLinesForSale(id),
  };
}

/**
 * خطوطِ مرجوعیِ یک فروش: اثرهای GOODS_OUTِ معلق در همه‌ی مرجوعی‌های آن.
 *
 * قرینه‌ی pendingReturnLinesForPurchase در سمت دریافت.
 */
export function pendingReturnLinesForSale(saleId) {
  const lines = [];
  allSalesReturns.forEach((ret) => {
    if (Number(ret.saleId) !== Number(saleId)) return;
    buildGoodsLines(ret, EFFECT_KINDS.GOODS_OUT).forEach((line) => {
      if (line.remainingQty <= 0) return;
      lines.push({ ...line, returnId: ret.id, returnNumber: ret.returnNumber });
    });
  });
  return lines;
}

/**
 * ثبت نهایی یک «دور آماده‌سازی/ارسال» در انبار.
 *
 * ۱. مقدار ارسالی هر قلم تجمعی است — از ارسال چندمرحله‌ای پشتیبانی می‌کند.
 * ۲. وضعیت فروش از روی تصویر کامل اقلام محاسبه می‌شود، نه حدس زده می‌شود.
 */
export async function confirmShipment(saleId, shipmentData) {
  await delay(500);

  const index = allSales.findIndex((s) => Number(s.id) === Number(saleId));
  if (index === -1) throw new Error("فروش یافت نشد");

  const sale = allSales[index];
  const shippedDate = shipmentData.shippedDate || new Date().toISOString().slice(0, 10);

  const orderRows = (shipmentData.shippedItems || []).filter(
    (row) => (row.source ?? SHIPPING_SOURCES.ORDER) === SHIPPING_SOURCES.ORDER,
  );
  const returnRows = (shipmentData.shippedItems || []).filter(
    (row) => row.source === SHIPPING_SOURCES.RETURN,
  );

  const updatedItems = sale.items.map((item) => {
    const shippedItem = orderRows.find((si) => si.productId === item.productId);
    if (!shippedItem) return item;

    const prevShipped = item.shippedQty || 0;
    const newShippedQty = Math.min(
      item.qty,
      prevShipped + (shippedItem.shippedQty || 0),
    );

    return { ...item, shippedQty: newShippedQty };
  });

  const allShipped = updatedItems.every((i) => (i.shippedQty || 0) >= i.qty);
  const anyShipped = updatedItems.some((i) => (i.shippedQty || 0) > 0);

  // «ارسال‌شده» یعنی همه‌چیز از انبار خارج شده؛ تبدیل به «تحویل کامل»
  // یک تأیید جداگانه (مثلاً توسط واحد فروش پس از تماس با مشتری) است و
  // اینجا خودکار انجام نمی‌شود.
  let newStatus = sale.status;
  if (allShipped) newStatus = SALE_STATUSES.SHIPPED;
  else if (anyShipped) newStatus = SALE_STATUSES.PARTIALLY_DELIVERED;

  allSales[index] = {
    ...sale,
    status: newStatus,
    items: updatedItems,
    shippingNote: shipmentData.shippingNote || "",
    shippedDate,
    driverName: shipmentData.driverName || "",
    driverNationalId: shipmentData.driverNationalId || "",
    vehiclePlate: shipmentData.vehiclePlate || "",
    shipmentHistory: [
      ...(sale.shipmentHistory || []),
      {
        id: generateId(),
        date: shippedDate,
        driverName: shipmentData.driverName || "",
        driverNationalId: shipmentData.driverNationalId || "",
        vehiclePlate: shipmentData.vehiclePlate || "",
        note: shipmentData.shippingNote || "",
        items: shipmentData.shippedItems.filter((i) => (i.shippedQty || 0) > 0),
      },
    ],
    updatedAt: new Date().toISOString(),
  };

  // واحدهای همین فروش، به‌اندازه‌ی مقدارِ ارسال‌شده‌ی این دور، از
  // «فروخته‌شده» به «ارسال‌شده» می‌روند.
  markUnitsShipped(
    saleId,
    orderRows.map((item) => ({
      productId: item.productId,
      qty: item.shippedQty || 0,
    })),
  );

  // خطوطِ مرجوعیِ همین حواله: هر کدام یک دورِ اجرای اثر روی مرجوعیِ
  // خودش. موجودی و وضعیت مرجوعی را همان موتور اثر جابه‌جا می‌کند.
  await applyReturnRows(returnRows, {
    date: shippedDate,
    partyName: shipmentData.driverName,
    partyNationalId: shipmentData.driverNationalId,
    vehiclePlate: shipmentData.vehiclePlate,
    note: shipmentData.shippingNote,
  });

  return allSales[index];
}

/**
 * خطوطِ مرجوعیِ یک حواله را به موتور اثرِ مرجوعی فروش می‌سپارد،
 * گروه‌بندی‌شده بر اساس مرجوعی تا هر مرجوعی یک بار به‌روز شود.
 */
async function applyReturnRows(rows, logistics) {
  const byReturn = new Map();
  rows.forEach((row) => {
    const qty = Number(row.shippedQty) || 0;
    if (qty <= 0) return;
    if (!byReturn.has(row.returnId)) byReturn.set(row.returnId, []);
    byReturn.get(row.returnId).push({ effectId: row.effectId, qty });
  });

  for (const [returnId, rounds] of byReturn) {
    await executeSalesReturnRound(returnId, { rounds, ...logistics });
  }
}
