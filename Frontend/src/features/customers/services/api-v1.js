// src/features/customers/services/api-v1.js

import axiosInstance from "@/shared/services/api/axios";

/**
 * دریافت لیست مشتری‌ها با فیلتر، صفحه‌بندی و مرتب‌سازی
 */
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
  const params = {
    page,
    limit,
    search: search || undefined,
    minBalance: minBalance !== "" ? minBalance : undefined,
    maxBalance: maxBalance !== "" ? maxBalance : undefined,
    balanceType: balanceType || undefined,
    sortBy,
    sortOrder,
  };

  const { data } = await axiosInstance.get("/customers", { params });

  // انتظار می‌رود بک‌اند ساختاری مشابه { items, total, page, totalPages } برگرداند
  return data;
}

/**
 * ایجاد مشتری جدید
 */
export async function createCustomer(customerData) {
  const { data } = await axiosInstance.post("/customers", customerData);
  return data;
}

/**
 * دریافت اطلاعات یک مشتری بر اساس id
 */
export const getCustomerById = async (id) => {
  const { data } = await axiosInstance.get(`/customers/${id}`);
  return data;
};

/**
 * ویرایش اطلاعات مشتری
 */
export const updateCustomer = async (id, updatedData) => {
  const { data } = await axiosInstance.put(`/customers/${id}`, updatedData);
  return data;
};

/**
 * حذف مشتری
 */
export const deleteCustomer = async (id) => {
  await axiosInstance.delete(`/customers/${id}`);
  return { success: true, id };
};
