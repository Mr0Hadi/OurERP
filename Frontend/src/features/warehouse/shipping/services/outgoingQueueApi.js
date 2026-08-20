import { allSales, SALE_STATUS_LABELS } from "@/features/sales/orders/services/mockData";
import {
  allSalesReturns,
  RESOLUTION_TYPES,
  RESOLUTION_LINE_STATUSES,
} from "@/features/sales/returns/services/mockData";
import {
  allPurchaseReturns,
  RESOLUTION_TYPES as PURCHASE_RESOLUTION_TYPES,
  RESOLUTION_LINE_STATUSES as PURCHASE_RESOLUTION_LINE_STATUSES,
} from "@/features/purchases/returns/services/mockData";
import { SHIPPING_ELIGIBLE_STATUSES } from "./constants";
import { computeItemShippableQty } from "./api-mockData";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const OUTGOING_TYPES = {
  SALE: "sale",
  RETURN_REPLACEMENT: "return_replacement",
  RETURN_TO_SUPPLIER: "return_to_supplier",
};
export const OUTGOING_TYPE_LABELS = {
  [OUTGOING_TYPES.SALE]: "ارسال فروش",
  [OUTGOING_TYPES.RETURN_REPLACEMENT]: "ارسال کالای جایگزین",
  [OUTGOING_TYPES.RETURN_TO_SUPPLIER]: "عودت کالا به تامین‌کننده",
};

// صف ارسال دیگر فقط رو به مشتری نیست: عودت مازاد به سمت تامین‌کننده
// می‌رود. پس طرفِ هر ردیف با کلید ترکیبی شناخته می‌شود، دقیقاً مثل
// صف دریافت که از اول هر دو نوع طرف حساب را داشت.
const partyKey = (type, id) => `${type}:${id}`;

function saleToRow(sale) {
  const remainingQty = sale.items.reduce((s, i) => s + computeItemShippableQty(i), 0);
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
    itemsCount: sale.items.length,
    remainingQty,
    amount: sale.totalAmount,
    createdAt: sale.createdAt,
    updatedAt: sale.updatedAt,
  };
}

/**
 * برای هر مرجوعی، تمام قلم‌هایی که تصمیم «ارسال کالای جایگزین» دارند
 * و هنوز به‌طور کامل ارسال نشده‌اند را جمع می‌کند و یک ردیف واحد
 * برمی‌گرداند — نه یک ردیف به‌ازای هر قلم. این باعث می‌شود انباردار
 * همه‌ی اقلام یک مرجوعی را در یک صفحه ببیند، دقیقاً مثل اقلام یک
 * فروش عادی.
 */
function collectReplacementRows() {
  const rows = [];
  allSalesReturns.forEach((salesReturn) => {
    const pendingLines = [];
    (salesReturn.items || []).forEach((item) => {
      (item.resolutions || []).forEach((resolution) => {
        if (
          resolution.type === RESOLUTION_TYPES.REPLACEMENT &&
          resolution.status === RESOLUTION_LINE_STATUSES.AWAITING
        ) {
          const remainingQty = resolution.qty - (resolution.shippedQty || 0);
          if (remainingQty > 0) pendingLines.push(remainingQty);
        }
      });
    });

    if (pendingLines.length === 0) return;

    const totalRemaining = pendingLines.reduce((s, q) => s + q, 0);
    rows.push({
      id: `return-${salesReturn.id}`,
      returnId: salesReturn.id,
      counterpartyId: salesReturn.customerId,
      counterpartyType: "customer",
      counterpartyKey: partyKey("customer", salesReturn.customerId),
      type: OUTGOING_TYPES.RETURN_REPLACEMENT,
      refNumber: salesReturn.returnNumber,
      counterpartyName: salesReturn.customerName,
      date: (salesReturn.updatedAt || salesReturn.createdAt || "").slice(0, 10),
      statusLabel: `${pendingLines.length.toLocaleString("fa-IR")} قلم کالای جایگزین`,
      itemsCount: pendingLines.length,
      remainingQty: totalRemaining,
      amount: 0,
      createdAt: salesReturn.createdAt,
      updatedAt: salesReturn.updatedAt,
    });
  });
  return rows;
}

/**
 * قرینه‌ی collectReplacementRows، اما رو به تامین‌کننده: هر مرجوعی خرید
 * که تصمیم «عودت کالا به تامین‌کننده» دارد و هنوز به‌طور کامل ارسال
 * نشده، یک ردیف واحد می‌شود — نه یک ردیف به‌ازای هر قلم — تا انباردار
 * کل محموله‌ی یک مرجوعی را در یک صفحه ببیند.
 */
function collectReturnToSupplierRows() {
  const rows = [];
  allPurchaseReturns.forEach((purchaseReturn) => {
    const pendingLines = [];
    (purchaseReturn.items || []).forEach((item) => {
      (item.resolutions || []).forEach((resolution) => {
        if (
          resolution.type === PURCHASE_RESOLUTION_TYPES.RETURN_TO_SUPPLIER &&
          resolution.status === PURCHASE_RESOLUTION_LINE_STATUSES.AWAITING
        ) {
          const remainingQty = resolution.qty - (resolution.shippedQty || 0);
          if (remainingQty > 0) pendingLines.push(remainingQty);
        }
      });
    });

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
    rows.push(...allSales.filter((s) => SHIPPING_ELIGIBLE_STATUSES.includes(s.status)).map(saleToRow));
  }
  if (!type || type === OUTGOING_TYPES.RETURN_REPLACEMENT) {
    rows.push(...collectReplacementRows());
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