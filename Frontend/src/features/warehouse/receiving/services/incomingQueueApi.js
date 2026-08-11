import { allPurchases, PURCHASE_STATUSES, PURCHASE_STATUS_LABELS } from "./mockData";
import {
  allSalesReturns, SALES_RETURN_STATUSES, SALES_RETURN_STATUS_LABELS,
} from "@/features/sales/returns/services/mockData";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const RECEIVING_ELIGIBLE_STATUSES = [PURCHASE_STATUSES.SHIPPED];
export const RETURN_INTAKE_ELIGIBLE_STATUSES = [SALES_RETURN_STATUSES.PENDING_INSPECTION];

export const INCOMING_TYPES = { PURCHASE: "purchase", SALES_RETURN: "sales_return" };
export const INCOMING_TYPE_LABELS = { [INCOMING_TYPES.PURCHASE]: "خرید", [INCOMING_TYPES.SALES_RETURN]: "مرجوعی فروش" };

function purchaseToRow(purchase) {
  return {
    id: purchase.id,
    type: INCOMING_TYPES.PURCHASE,
    refNumber: purchase.invoiceNumber,
    counterpartyId: purchase.supplierId,
    counterpartyType: "supplier",
    counterpartyName: purchase.supplierName,
    date: purchase.invoiceDate,
    itemsCount: (purchase.items || []).length,
    amount: purchase.totalAmount,
    createdAt: purchase.createdAt,
    updatedAt: purchase.updatedAt,
  };
}

function returnToRow(salesReturn) {
  return {
    id: salesReturn.id,
    type: INCOMING_TYPES.SALES_RETURN,
    refNumber: salesReturn.returnNumber,
    counterpartyId: salesReturn.customerId,
    counterpartyType: "customer",
    counterpartyName: salesReturn.customerName,
    date: salesReturn.returnDate,
    itemsCount: (salesReturn.items || []).length,
    amount: salesReturn.totalClaimedAmount,
    createdAt: salesReturn.createdAt,
    updatedAt: salesReturn.updatedAt,
  };
}

export async function fetchIncomingQueue(params = {}) {
  await delay(500);
  const {
    page = 1, limit = 10, search = "", type = "", counterpartyIds = [],
    fromDate = "", toDate = "", sortBy = "createdAt", sortOrder = "desc",
  } = params;

  let rows = [];
  if (!type || type === INCOMING_TYPES.PURCHASE) {
    rows.push(...allPurchases.filter((p) => RECEIVING_ELIGIBLE_STATUSES.includes(p.status)).map(purchaseToRow));
  }
  if (!type || type === INCOMING_TYPES.SALES_RETURN) {
    rows.push(...allSalesReturns.filter((r) => RETURN_INTAKE_ELIGIBLE_STATUSES.includes(r.status)).map(returnToRow));
  }

  if (search) {
    const s = search.toLowerCase();
    rows = rows.filter((row) => row.refNumber?.toLowerCase().includes(s) || row.counterpartyName?.toLowerCase().includes(s));
  }

  if (Array.isArray(counterpartyIds) && counterpartyIds.length > 0) {
    rows = rows.filter((row) => counterpartyIds.includes(`${row.counterpartyType}:${row.counterpartyId}`));
  }

  if (fromDate) rows = rows.filter((row) => row.date && row.date.slice(0, 10) >= fromDate.slice(0, 10));
  if (toDate) rows = rows.filter((row) => row.date && row.date.slice(0, 10) <= toDate.slice(0, 10));

  rows.sort((a, b) => {
    let aVal = a[sortBy];
    let bVal = b[sortBy];
    if (["createdAt", "updatedAt", "date"].includes(sortBy)) {
      aVal = aVal ? new Date(aVal).getTime() : 0;
      bVal = bVal ? new Date(bVal).getTime() : 0;
    } else if (sortBy === "amount" || sortBy === "itemsCount") {
      aVal = Number(aVal) || 0;
      bVal = Number(bVal) || 0;
    } else if (typeof aVal === "string") {
      return sortOrder === "asc" ? aVal.localeCompare(bVal ?? "", "fa") : (bVal ?? "").localeCompare(aVal, "fa");
    }
    return sortOrder === "asc" ? (aVal > bVal ? 1 : -1) : aVal < bVal ? 1 : -1;
  });

  const total = rows.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const start = (page - 1) * limit;
  const items = rows.slice(start, start + limit);
  return { items, total, page, totalPages };
}