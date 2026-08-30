// src/features/customers/services/api-v1.js

import axiosInstance from "@/shared/services/api/axios";
import { normalizeListResponse } from "@/shared/services/api/contract";

/**
 * لایه‌ی تماس با `api/Customer` (بخش ۳ سند api-guide.fa.md).
 *
 * مسیرها REST نیستند: کنترلر با نامِ اکشن آدرس‌دهی می‌شود
 * (`GetCustomerList`, `CreateCustomer`, …) و برای ویرایش/حذف، شناسه در
 * بدنه یا query می‌رود نه در مسیر.
 *
 * نامِ پارامترهای فیلتر با تامین‌کننده **یکی نیست** — هر دو کنترلر
 * قرارداد خودشان را دارند و نباید از روی هم حدس زده شوند:
 *
 *   مشتری:        `fullName`, `minBalance`, `maxBalance`, `balanceType`
 *   تامین‌کننده:  `companyNameOrContactName`, `fromBalance`, `toBalance`
 *
 * مرتب‌سازی را هیچ‌کدام پشتیبانی نمی‌کنند.
 */
export async function fetchCustomers({
  page = 1,
  limit = 10,
  search = "",
  minBalance = "",
  maxBalance = "",
  balanceType = "",
} = {}) {
  const { data } = await axiosInstance.get("/Customer/GetCustomerList", {
    params: {
      page,
      take: limit,
      fullName: search || undefined,
      minBalance: minBalance !== "" ? minBalance : undefined,
      maxBalance: maxBalance !== "" ? maxBalance : undefined,
      balanceType: balanceType !== "" ? balanceType : undefined,
    },
  });

  return normalizeListResponse(data, { itemsKey: "customerList" });
}

export async function createCustomer(customerData) {
  const { data } = await axiosInstance.post(
    "/Customer/CreateCustomer",
    customerData,
  );
  return data;
}

export const getCustomerById = async (id) => {
  const { data } = await axiosInstance.get("/Customer/GetCustomerDetail", {
    params: { id },
  });
  return data;
};

/** شناسه در *بدنه* می‌رود، نه در مسیر — `UpdateCustomerCommand.Id`. */
export const updateCustomer = async (id, updatedData) => {
  const { data } = await axiosInstance.put("/Customer/UpdateCustomer", {
    id,
    ...updatedData,
  });
  return data;
};

export const deleteCustomer = async (id) => {
  await axiosInstance.delete("/Customer/DeleteCustomer", { params: { id } });
  return { success: true, id };
};
