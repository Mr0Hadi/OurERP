import { allSales, SALE_STATUSES, SALE_STATUS_LABELS } from "./mockData";
import { markUnitsShipped } from "@/features/warehouse/units/services/api-mockData";
import { applyListQuery } from "@/shared/services/mockQuery";
import { runOnce } from "@/shared/services/mockIdempotency";

import { allSalesReturns } from "@/features/sales/returns/services/mockData";
import { executeGoodsRound as executeSalesReturnRound } from "@/features/sales/returns/services/api-mockData";
import { allPurchaseReturns } from "@/features/purchases/returns/services/mockData";
import { executeGoodsRound as executePurchaseReturnRound } from "@/features/purchases/returns/services/api-mockData";
import { buildGoodsLines, pendingGoodsEffects } from "@/shared/domain/returns/resolutions";
import { EFFECT_KINDS, remainingQtyOf } from "@/shared/domain/returns/effects";

import {
  OUTGOING_TYPES,
  SHIPPING_ELIGIBLE_STATUSES,
  SHIPPING_SOURCES,
} from "../domain/shippingVocabulary";

/**
 * کلِ APIِ ارسال انبار — نسخه‌ی mock. قرینه‌ی سمت دریافت.
 *
 * پیش‌تر دو فایل بود (api-mockData / outgoingQueueApi) و بدتر از آن،
 * mutations.js برای عودت به تامین‌کننده مستقیماً موتور اثرِ فیچرِ
 * *مرجوعی خرید* را صدا می‌زد و payload فرم را بدون ترجمه به آن می‌داد.
 * چون فرم `shippedItems` می‌سازد و موتور `rounds` می‌خواهد، آن مسیر
 * همیشه با «هیچ کالایی برای ثبت انتخاب نشده است» شکست می‌خورد. حالا
 * ترجمه اینجاست، جایی که سمت دریافت هم دارد.
 */

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const generateId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

const partyKey = (type, id) => `${type}:${id}`;

// ─── محاسبات داخلی ──────────────────────────────────────────────────────────

/**
 * چقدر از یک قلم فروش هنوز واقعاً قابل ارسال است — همین باعث می‌شود
 * ارسال چندمرحله‌ای (چند محموله/چند ماشین) طبیعی کار کند.
 */
function computeItemShippableQty(item) {
  return Math.max(0, (item.qty || 0) - (item.shippedQty || 0));
}

/**
 * کالای جایگزینی که بابت مرجوعی‌های یک فروش به مشتری بدهکاریم و
 * می‌تواند با همان ماشینِ خودِ فروش برود.
 */
function pendingReturnLinesForSale(saleId) {
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
 * یک فروش تا وقتی در صف ارسال می‌ماند که یا هنوز چیزی از خودِ سفارش
 * نرفته باشد، یا بابت مرجوعی‌هایش کالای جایگزینی بدهکار باشیم.
 */
function isSaleAwaitingDispatch(sale) {
  return (
    SHIPPING_ELIGIBLE_STATUSES.includes(sale.status) ||
    pendingReturnLinesForSale(sale.id).length > 0
  );
}

/**
 * «تعداد اقلام» یعنی چند خط هنوز کارِ انبار دارد، نه چند خط روی سند
 * است — همان تعریفی که صف دریافت دارد. خطی که کاملاً ارسال شده دیگر
 * در صفحه‌ی ارسال دیده نمی‌شود، پس نباید در شمارشِ صف هم بیاید.
 */
function saleToRow(sale) {
  const returnLines = pendingReturnLinesForSale(sale.id);
  const returnQty = returnLines.reduce((s, l) => s + l.remainingQty, 0);
  const openItems = sale.items.filter((item) => computeItemShippableQty(item) > 0);
  return {
    id: `sale-${sale.id}`,
    saleId: sale.id,
    counterpartyId: sale.customerId,
    counterpartyType: "customer",
    counterpartyKey: partyKey("customer", sale.customerId),
    type: OUTGOING_TYPES.SALE,
    refNumber: sale.invoiceNumber,
    counterpartyName: sale.customerName,
    date: sale.invoiceDate,
    statusLabel: SALE_STATUS_LABELS[sale.status] ?? sale.status,
    itemsCount: openItems.length + returnLines.length,
    returnLinesCount: returnLines.length,
    remainingQty:
      openItems.reduce((s, i) => s + computeItemShippableQty(i), 0) + returnQty,
    amount: sale.totalAmount,
    createdAt: sale.createdAt,
    updatedAt: sale.updatedAt,
  };
}

/**
 * عودت مازاد به تامین‌کننده — یک ردیف به‌ازای هر مرجوعی، نه به‌ازای هر
 * قلم، تا انباردار کل محموله را در یک صفحه ببیند.
 *
 * برخلاف کالای جایگزینِ مشتری که با حواله‌ی خودِ فروش می‌رود، اینجا
 * هیچ سندِ خروجی‌ای به سمت تامین‌کننده وجود ندارد که به آن بچسبد.
 */
function supplierReturnRows() {
  const rows = [];
  allPurchaseReturns.forEach((purchaseReturn) => {
    const pendingQtys = pendingGoodsEffects(purchaseReturn, EFFECT_KINDS.GOODS_OUT)
      .map(remainingQtyOf)
      .filter((qty) => qty > 0);

    if (pendingQtys.length === 0) return;

    rows.push({
      id: `supplier-return-${purchaseReturn.id}`,
      returnId: purchaseReturn.id,
      counterpartyId: purchaseReturn.supplierId,
      counterpartyType: "supplier",
      counterpartyKey: partyKey("supplier", purchaseReturn.supplierId),
      type: OUTGOING_TYPES.RETURN_TO_SUPPLIER,
      refNumber: purchaseReturn.returnNumber,
      counterpartyName: purchaseReturn.supplierName,
      date: (purchaseReturn.updatedAt || purchaseReturn.createdAt || "").slice(0, 10),
      statusLabel: `${pendingQtys.length.toLocaleString("fa-IR")} قلم عودتی`,
      itemsCount: pendingQtys.length,
      remainingQty: pendingQtys.reduce((s, q) => s + q, 0),
      amount: 0,
      createdAt: purchaseReturn.createdAt,
      updatedAt: purchaseReturn.updatedAt,
    });
  });
  return rows;
}

/**
 * ردیف‌های فرم را به «دورِ اجرای اثر» ترجمه می‌کند و به موتور اثرِ
 * مرجوعی می‌سپارد، گروه‌بندی‌شده بر اساس مرجوعی.
 *
 * برخلاف سمت دریافت، اینجا healthyQty معنا ندارد: کالایی که *ما*
 * می‌فرستیم سالم است؛ اگر نبود اصلاً نمی‌رفت.
 */
async function applyReturnRows(rows, logistics, executeRound, fallbackReturnId) {
  const byReturn = new Map();

  rows.forEach((row) => {
    const qty = Number(row.shippedQty) || 0;
    if (qty <= 0) return;
    const returnId = row.returnId ?? fallbackReturnId;
    if (!byReturn.has(returnId)) byReturn.set(returnId, []);
    byReturn.get(returnId).push({ effectId: row.effectId, qty });
  });

  let last = null;
  for (const [returnId, rounds] of byReturn) {
    last = await executeRound(returnId, { rounds, ...logistics });
  }
  return last;
}

function logisticsOf(shipmentData, date) {
  return {
    date,
    partyName: shipmentData.driverName,
    partyNationalId: shipmentData.driverNationalId,
    vehiclePlate: shipmentData.vehiclePlate,
    note: shipmentData.shippingNote,
  };
}

// ─── سطحِ عمومی ─────────────────────────────────────────────────────────────

/**
 * صف یکپارچه‌ی «چیزهایی که باید از انبار بیرون بروند»: فروش‌های در
 * انتظار ارسال (به‌همراه کالای جایگزینِ مرجوعی‌هایشان)، و عودت‌های
 * تامین‌کننده.
 */
export async function fetchOutgoingQueue(params = {}) {
  await delay(500);

  const { type = "", counterpartyIds = [] } = params;
  let rows = [];

  if (!type || type === OUTGOING_TYPES.SALE) {
    rows.push(...allSales.filter(isSaleAwaitingDispatch).map(saleToRow));
  }
  if (!type || type === OUTGOING_TYPES.RETURN_TO_SUPPLIER) {
    rows.push(...supplierReturnRows());
  }

  if (Array.isArray(counterpartyIds) && counterpartyIds.length > 0) {
    rows = rows.filter((row) => counterpartyIds.includes(row.counterpartyKey));
  }

  return applyListQuery(rows, params, {
    searchFields: ["refNumber", "counterpartyName"],
    dateField: "date",
    numericFields: ["amount", "itemsCount", "remainingQty"],
  });
}

/**
 * فروش به‌همراه shippableQty هر قلم و خطوط مرجوعیِ همان فروش. فرم
 * ارسال باید فقط از همین مقادیر استفاده کند.
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
    returnLines: pendingReturnLinesForSale(sale.id),
  };
}

/**
 * ثبت یک «دور ارسال».
 *
 * خطوط بر اساس source جدا می‌شوند: خطوط فروش مقدار ارسال‌شده‌ی قلم را
 * جلو می‌برند و وضعیت فروش را تعیین می‌کنند، خطوط مرجوعی به موتور اثر
 * می‌روند.
 *
 * markUnitsShipped عمداً فقط روی خطوط فروش اجرا می‌شود: کالای جایگزین
 * در برابر تعداد خودِ فروش نیست و نباید واحدهای آن را مصرف کند.
 *
 * «ارسال‌شده» یعنی همه‌چیز از انبار خارج شده؛ تبدیلش به «تحویل کامل»
 * تأییدی جداگانه است و اینجا خودکار انجام نمی‌شود.
 */
export async function confirmShipment(
  saleId,
  shipmentData,
  { idempotencyKey } = {},
) {
  return runOnce(idempotencyKey, () => confirmShipmentOnce(saleId, shipmentData));
}

async function confirmShipmentOnce(saleId, shipmentData) {
  await delay(500);

  const index = allSales.findIndex((s) => Number(s.id) === Number(saleId));
  if (index === -1) throw new Error("فروش یافت نشد");

  const sale = allSales[index];
  const shippedDate =
    shipmentData.shippedDate || new Date().toISOString().slice(0, 10);

  const rows = shipmentData.shippedItems || [];
  const orderRows = rows.filter(
    (row) => (row.source ?? SHIPPING_SOURCES.ORDER) === SHIPPING_SOURCES.ORDER,
  );
  const returnRows = rows.filter((row) => row.source === SHIPPING_SOURCES.RETURN);

  const updatedItems = sale.items.map((item) => {
    const shippedItem = orderRows.find((si) => si.productId === item.productId);
    if (!shippedItem) return item;
    return {
      ...item,
      shippedQty: Math.min(
        item.qty,
        (item.shippedQty || 0) + (shippedItem.shippedQty || 0),
      ),
    };
  });

  const allShipped = updatedItems.every((i) => (i.shippedQty || 0) >= i.qty);
  const anyShipped = updatedItems.some((i) => (i.shippedQty || 0) > 0);

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
        items: rows.filter((i) => (i.shippedQty || 0) > 0),
      },
    ],
    updatedAt: new Date().toISOString(),
  };

  markUnitsShipped(
    saleId,
    orderRows.map((item) => ({
      productId: item.productId,
      qty: item.shippedQty || 0,
    })),
  );

  await applyReturnRows(
    returnRows,
    logisticsOf(shipmentData, shippedDate),
    executeSalesReturnRound,
  );

  return allSales[index];
}

/**
 * ثبت یک دور عودت کالا به تامین‌کننده.
 *
 * قرینه‌ی confirmReturnIntake در سمت دریافت: همان payloadی که فرمِ
 * ارسال می‌سازد را می‌گیرد و به دورِ اثر ترجمه می‌کند. اینجا سندِ
 * فروشی در کار نیست، پس همه‌ی ردیف‌ها مرجوعی‌اند.
 */
export async function confirmSupplierReturnShipment(
  returnId,
  shipmentData,
  { idempotencyKey } = {},
) {
  return runOnce(idempotencyKey, () =>
    confirmSupplierReturnShipmentOnce(returnId, shipmentData),
  );
}

async function confirmSupplierReturnShipmentOnce(returnId, shipmentData) {
  const shippedDate =
    shipmentData.shippedDate || new Date().toISOString().slice(0, 10);

  const updated = await applyReturnRows(
    shipmentData.shippedItems || [],
    logisticsOf(shipmentData, shippedDate),
    executePurchaseReturnRound,
    returnId,
  );

  if (!updated) throw new Error("هیچ کالایی برای ثبت انتخاب نشده است");
  return updated;
}
