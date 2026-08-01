// src/features/warehouse/shipping/services/outgoingQueueApi.js
import { allSales, SALE_STATUS_LABELS } from "@/features/sales/services/mockData";
import {
  allSalesReturns,
  RESOLUTION_TYPES,
  RESOLUTION_LINE_STATUSES,
} from "@/features/sales/services/returns/mockData";
import { SHIPPING_ELIGIBLE_STATUSES } from "./constants";
import { computeItemShippableQty } from "./api-mockData";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const OUTGOING_TYPES = { SALE: "sale", RETURN_REPLACEMENT: "return_replacement" };
export const OUTGOING_TYPE_LABELS = {
  [OUTGOING_TYPES.SALE]: "ارسال فروش",
  [OUTGOING_TYPES.RETURN_REPLACEMENT]: "ارسال کالای جایگزین",
};

function saleToRow(sale) {
  const remainingQty = sale.items.reduce((s, i) => s + computeItemShippableQty(i), 0);
  return {
    id: `sale-${sale.id}`,
    saleId: sale.id,
    customerId: sale.customerId,
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
      customerId: salesReturn.customerId,
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

export async function fetchOutgoingQueue(params = {}) {
  await delay(500);
  const {
    page = 1,
    limit = 10,
    search = "",
    type = "",
    customerIds = [],
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

  if (search) {
    const s = search.toLowerCase();
    rows = rows.filter(
      (row) =>
        row.refNumber?.toLowerCase().includes(s) ||
        row.counterpartyName?.toLowerCase().includes(s),
    );
  }

  if (Array.isArray(customerIds) && customerIds.length > 0) {
    rows = rows.filter((row) => customerIds.includes(row.customerId));
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