import { allSales, SALE_STATUSES } from "./mockData";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function createSale(saleData) {
  await delay(800);

  if (Math.random() < 0.05) {
    throw new Error("خطا در ثبت فروش");
  }

  const newSale = {
    id: String(Date.now()),
    ...saleData,
    status: SALE_STATUSES.PENDING,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  allSales.unshift(newSale);
  return newSale;
}

export async function fetchSales(params = {}) {
  await delay(500);

  const {
    page = 1,
    limit = 10,
    search = "",
    customerId = "",
    status = "",
    paymentType = "",
    fromDate = "",
    toDate = "",
    sortBy = "createdAt",
    sortOrder = "desc",
  } = params;

  let filtered = [...allSales];

  if (search) {
    const searchLower = search.toLowerCase();
    filtered = filtered.filter(
      (s) =>
        s.invoiceNumber.toLowerCase().includes(searchLower) ||
        s.customerName.toLowerCase().includes(searchLower) ||
        (s.description && s.description.toLowerCase().includes(searchLower))
    );
  }

  if (params.customerIds && params.customerIds.length > 0) {
    filtered = filtered.filter((s) =>
      params.customerIds.includes(s.customerId)
    );
  }

  if (status) {
    filtered = filtered.filter((s) => s.status === status);
  }

  if (paymentType) {
    filtered = filtered.filter((s) => s.paymentType === paymentType);
  }

  if (fromDate) {
    filtered = filtered.filter(
      (s) => new Date(s.createdAt) >= new Date(fromDate)
    );
  }
  if (toDate) {
    filtered = filtered.filter(
      (s) => new Date(s.createdAt) <= new Date(toDate)
    );
  }

  filtered.sort((a, b) => {
    let aVal = a[sortBy];
    let bVal = b[sortBy];

    if (sortBy === "createdAt" || sortBy === "updatedAt") {
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

    return sortOrder === "asc" ? (aVal > bVal ? 1 : -1) : aVal < bVal ? 1 : -1;
  });

  const total = filtered.length;
  const totalPages = Math.ceil(total / limit);
  const start = (page - 1) * limit;
  const items = filtered.slice(start, start + limit);

  return { items, total, page, totalPages };
}

export async function fetchSaleById(id) {
  await delay(300);

  const sale = allSales.find((s) => s.id === id);
  if (!sale) throw new Error("فروش یافت نشد");
  return sale;
}

export async function updateSale(id, updates) {
  await delay(600);

  const index = allSales.findIndex((s) => s.id === id);
  if (index === -1) throw new Error("فروش یافت نشد");

  allSales[index] = {
    ...allSales[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  return allSales[index];
}

export async function updateSaleStatus(id, newStatus) {
  return updateSale(id, { status: newStatus });
}

export async function removeSale(id) {
  await delay(600);

  
  const index = allSales.findIndex((p) => p.id == id);
  

  if (index === -1) {
    throw new Error("خرید یافت نشد");
  }

  const removed = allSales.splice(index, 1)[0];
  return removed;
}

export async function deleteSale(id) {
  return updateSaleStatus(id, SALE_STATUSES.CANCELLED);
}

export async function updateSalePayment(id, paymentData) {
  await delay(600);

  const index = allSales.findIndex((s) => s.id === id);
  if (index === -1) throw new Error("فروش یافت نشد");

  const current = allSales[index];
  allSales[index] = {
    ...current,
    paidAmount: current.paidAmount + (paymentData.amount || 0),
    updatedAt: new Date().toISOString(),
    ...paymentData,
  };

  return allSales[index];
}
