import { allCustomers } from "./mockData";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchCustomers({
  page = 1,
  limit = 10,
  search = "",
  minBalance = "",
  maxBalance = "",
  sortBy = "lastName",
  sortOrder = "asc",
} = {}) {
  await delay(500);

  

  let result = [...allCustomers];

  // جستجو روی نام کامل و کد مشتری
  if (search) {
    const q = search.toLowerCase();
    result = result.filter(
      (c) =>
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q)
    );
  }

  // محدوده بدهی/طلب
  if (minBalance !== "" && minBalance !== undefined) {
    result = result.filter((c) => c.balance >= Number(minBalance));
  }
  if (maxBalance !== "" && maxBalance !== undefined) {
    result = result.filter((c) => c.balance <= Number(maxBalance));
  }

  // مرتب‌سازی
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

export async function fetchCustomerById(id) {
  await delay(300);
  const customer = allCustomers.find((c) => c.id === id);
  if (!customer) throw new Error("مشتری یافت نشد");
  return customer;
}
