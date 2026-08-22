import { allSales, SALE_STATUS_LABELS } from "@/features/sales/orders/services/mockData";
import { pendingGoodsEffects } from "@/shared/domain/returns/resolutions";
import {
  EFFECT_KINDS,
  remainingQtyOf,
} from "@/shared/domain/returns/effects";
import { allPurchaseReturns } from "@/features/purchases/returns/services/mockData";
import { SHIPPING_ELIGIBLE_STATUSES } from "./constants";
import {
  computeItemShippableQty,
  pendingReturnLinesForSale,
} from "./api-mockData";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const OUTGOING_TYPES = {
  SALE: "sale",
  RETURN_TO_SUPPLIER: "return_to_supplier",
};
export const OUTGOING_TYPE_LABELS = {
  [OUTGOING_TYPES.SALE]: "ارسال فروش",
  [OUTGOING_TYPES.RETURN_TO_SUPPLIER]: "عودت کالا به تامین‌کننده",
};

// صف ارسال دیگر فقط رو به مشتری نیست: عودت مازاد به سمت تامین‌کننده
// می‌رود. پس طرفِ هر ردیف با کلید ترکیبی شناخته می‌شود، دقیقاً مثل
// صف دریافت که از اول هر دو نوع طرف حساب را داشت.
const partyKey = (type, id) => `${type}:${id}`;

/**
 * یک فروش تا وقتی در صف ارسال می‌ماند که یا هنوز چیزی از خودِ سفارش
 * نرفته باشد، یا بابت مرجوعی‌های آن کالای جایگزینی به مشتری بدهکار
 * باشیم.
 *
 * حالت دوم عمدی است — قرینه‌ی همان چیزی که در صف دریافت انجام شد: یک
 * ماشین که به سمت مشتری می‌رود می‌تواند هم کالای فروش ببرد و هم کالای
 * جایگزین. پیش‌تر این دو، دو ردیف و دو صفحه‌ی جدا بودند.
 */
export function isSaleAwaitingDispatch(sale) {
  return (
    SHIPPING_ELIGIBLE_STATUSES.includes(sale.status) ||
    pendingReturnLinesForSale(sale.id).length > 0
  );
}

function saleToRow(sale) {
  const returnLines = pendingReturnLinesForSale(sale.id);
  const returnQty = returnLines.reduce((s, l) => s + l.remainingQty, 0);
  const remainingQty =
    sale.items.reduce((s, i) => s + computeItemShippableQty(i), 0) + returnQty;
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
    itemsCount: sale.items.length + returnLines.length,
    returnLinesCount: returnLines.length,
    remainingQty,
    amount: sale.totalAmount,
    createdAt: sale.createdAt,
    updatedAt: sale.updatedAt,
  };
}

/**
 * عودت مازاد به تامین‌کننده. برخلاف کالای جایگزینِ مشتری که با
 * که تصمیم «عودت کالا به تامین‌کننده» دارد و هنوز به‌طور کامل ارسال
 * نشده، یک ردیف واحد می‌شود — نه یک ردیف به‌ازای هر قلم — تا انباردار
 * کل محموله‌ی یک مرجوعی را در یک صفحه ببیند.
 */
function collectReturnToSupplierRows() {
  const rows = [];
  allPurchaseReturns.forEach((purchaseReturn) => {
    // مثل سمت فروش، منبع همان اثرهای GOODS_OUT معلق است — نه یک نوعِ
    // تصمیمِ خاص.
    const pendingLines = pendingGoodsEffects(
      purchaseReturn,
      EFFECT_KINDS.GOODS_OUT,
    )
      .map(remainingQtyOf)
      .filter((qty) => qty > 0);

    if (pendingLines.length === 0) return;

    const totalRemaining = pendingLines.reduce((s, q) => s + q, 0);
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
      statusLabel: `${pendingLines.length.toLocaleString("fa-IR")} قلم عودتی`,
      itemsCount: pendingLines.length,
      remainingQty: totalRemaining,
      amount: 0,
      createdAt: purchaseReturn.createdAt,
      updatedAt: purchaseReturn.updatedAt,
    });
  });
  return rows;
}

export async function fetchOutgoingQueue(params = {}) {
  await delay(500);
  const {
    page = 1,
    limit = 10,
    search = "",
    type = "",
    counterpartyIds = [],
    fromDate = "",
    toDate = "",
    sortBy = "createdAt",
    sortOrder = "desc",
  } = params;

  let rows = [];
  if (!type || type === OUTGOING_TYPES.SALE) {
    rows.push(...allSales.filter(isSaleAwaitingDispatch).map(saleToRow));
  }
  if (!type || type === OUTGOING_TYPES.RETURN_TO_SUPPLIER) {
    rows.push(...collectReturnToSupplierRows());
  }

  if (search) {
    const s = search.toLowerCase();
    rows = rows.filter(
      (row) =>
        row.refNumber?.toLowerCase().includes(s) ||
        row.counterpartyName?.toLowerCase().includes(s),
    );
  }

  if (Array.isArray(counterpartyIds) && counterpartyIds.length > 0) {
    rows = rows.filter((row) => counterpartyIds.includes(row.counterpartyKey));
  }

  if (fromDate) rows = rows.filter((row) => row.date && row.date.slice(0, 10) >= fromDate.slice(0, 10));
  if (toDate) rows = rows.filter((row) => row.date && row.date.slice(0, 10) <= toDate.slice(0, 10));

  rows.sort((a, b) => {
    let aVal = a[sortBy];
    let bVal = b[sortBy];
    if (["createdAt", "updatedAt", "date"].includes(sortBy)) {
      aVal = aVal ? new Date(aVal).getTime() : 0;
      bVal = bVal ? new Date(bVal).getTime() : 0;
    } else if (sortBy === "amount" || sortBy === "itemsCount" || sortBy === "remainingQty") {
      aVal = Number(aVal) || 0;
      bVal = Number(bVal) || 0;
    } else if (typeof aVal === "string") {
      return sortOrder === "asc"
        ? aVal.localeCompare(bVal ?? "", "fa")
        : (bVal ?? "").localeCompare(aVal, "fa");
    }
    return sortOrder === "asc" ? (aVal > bVal ? 1 : -1) : aVal < bVal ? 1 : -1;
  });

  const total = rows.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const start = (page - 1) * limit;
  const items = rows.slice(start, start + limit);
  return { items, total, page, totalPages };
}