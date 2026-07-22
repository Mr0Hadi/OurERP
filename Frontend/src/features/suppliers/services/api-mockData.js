// src/features/suppliers/services/api-mockData.js
import { allSuppliers } from "./mockData";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchSuppliers({
  page = 1,
  limit = 10,
  search = "",
  minBalance = "",
  maxBalance = "",
  balanceType = "",
  sortBy = "companyName",
  sortOrder = "asc",
} = {}) {
  await delay(500);
  let result = [...allSuppliers];

  if (search) {
    const q = search.toLowerCase();
    result = result.filter(
      (s) =>
        s.companyName?.toLowerCase().includes(q) ||
        `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) ||
        s.id.toString().toLowerCase().includes(q),
    );
  }

  if (balanceType) {
    result = result.filter((s) => s.balanceType === balanceType);
  }

  if (minBalance !== "" && minBalance !== undefined) {
    result = result.filter((s) => s.balance >= Number(minBalance));
  }
  if (maxBalance !== "" && maxBalance !== undefined) {
    result = result.filter((s) => s.balance <= Number(maxBalance));
  }

  result.sort((a, b) => {
    let aVal, bVal;
    if (sortBy === "fullName") {
      aVal = `${a.firstName} ${a.lastName}`;
      bVal = `${b.firstName} ${b.lastName}`;
    } else {
      aVal = a[sortBy];
      bVal = b[sortBy];
    }

    if (typeof aVal === "string") {
      return sortOrder === "asc"
        ? aVal.localeCompare(bVal, "fa")
        : bVal.localeCompare(aVal, "fa");
    }

    return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
  });

  const total = result.length;
  const totalPages = Math.ceil(total / limit);
  const items = result.slice((page - 1) * limit, page * limit);

  return { items, total, page, totalPages };
}

export async function createSupplier(supplierData) {
  await delay(500);

  const newId = allSuppliers.length
    ? Math.max(...allSuppliers.map((s) => Number(s.id))) + 1
    : 1;

  const now = new Date().toISOString();

  const newSupplier = {
    id: newId,
    Description: "",
    balanceType: "none",
    balance: 0,
    image: null,
    ...supplierData,
    createdAt: now,
    updatedAt: now,
  };

  allSuppliers.push(newSupplier);
  return newSupplier;
}

export const getSupplierById = async (id) => {
  await delay(500);
  const supplier = allSuppliers.find((s) => s.id == id);
  if (!supplier) throw new Error("تامین‌کننده یافت نشد");
  return supplier;
};

export const updateSupplier = async (id, updatedData) => {
  await delay(800);
  const index = allSuppliers.findIndex((s) => s.id == id);
  if (index === -1) throw new Error("تامین‌کننده یافت نشد");
  allSuppliers[index] = {
    ...allSuppliers[index],
    ...updatedData,
    updatedAt: new Date().toISOString(),
  };
  return allSuppliers[index];
};

export const deleteSupplier = async (id) => {
  await delay(500);
  const index = allSuppliers.findIndex((s) => s.id == id);
  if (index === -1) throw new Error("تامین‌کننده یافت نشد");
  allSuppliers.splice(index, 1);
  return { success: true, id };
};