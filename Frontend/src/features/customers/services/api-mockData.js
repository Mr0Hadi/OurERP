// src/features/customers/services/api-mockData.js
import { allCustomers } from "./mockData";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchCustomers({
  page = 1,
  limit = 10,
  search = "",
  minBalance = "",
  maxBalance = "",
  balanceType = "",
  sortBy = "lastName",
  sortOrder = "asc",
} = {}) {
  await delay(500);

  let result = [...allCustomers];

  if (search) {
    const q = search.toLowerCase();
    result = result.filter(
      (c) =>
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
        c.id.toString().toLowerCase().includes(q),
    );
  }

  if (balanceType) {
    result = result.filter((c) => c.balanceType === balanceType);
  }

  if (minBalance !== "" && minBalance !== undefined) {
    result = result.filter((c) => c.balance >= Number(minBalance));
  }
  if (maxBalance !== "" && maxBalance !== undefined) {
    result = result.filter((c) => c.balance <= Number(maxBalance));
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

export async function createCustomer(customerData) {
  await delay(500);

  const newId = allCustomers.length
    ? Math.max(...allCustomers.map((c) => Number(c.id))) + 1
    : 1;

  const now = new Date().toISOString();

  const newCustomer = {
    id: newId,
    referralCode: "",
    creditLimit: 0,
    Description: "",
    balanceType: "none",
    balance: 0,
    image: null,
    ...customerData,
    createdAt: now,
    updatedAt: now,
  };

  allCustomers.push(newCustomer);

  return newCustomer;
}

export const getCustomerById = async (id) => {
  await new Promise((resolve) => setTimeout(resolve, 500));

  const customer = allCustomers.find((c) => c.id == id);
  if (!customer) {
    throw new Error("مشتری یافت نشد");
  }
  return customer;
};

export const updateCustomer = async (id, updatedData) => {
  await new Promise((resolve) => setTimeout(resolve, 800));

  const index = allCustomers.findIndex((c) => c.id == id);
  if (index === -1) {
    throw new Error("مشتری یافت نشد");
  }

  allCustomers[index] = {
    ...allCustomers[index],
    ...updatedData,
    updatedAt: new Date().toISOString(),
  };
  return allCustomers[index];
};

export const deleteCustomer = async (id) => {
  await new Promise((resolve) => setTimeout(resolve, 500));

  const index = allCustomers.findIndex((c) => c.id == id);
  if (index === -1) {
    throw new Error("مشتری یافت نشد");
  }

  allCustomers.splice(index, 1);
  return { success: true, id };
};
