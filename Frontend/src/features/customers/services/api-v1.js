import axiosInstance from "@/shared/services/api/axios";
import { normalizeListResponse } from "@/shared/services/api/contract";

/**
 * لایه‌ی تماس با `api/Customer` (بخش ۳ سند api-guide.fa.md).
 *
 * مسیرها REST نیستند: کنترلر با نامِ اکشن آدرس‌دهی می‌شود
 * (`GetCustomerList`, `CreateCustomer`, …) و برای ویرایش/حذف، شناسه در
 * بدنه یا query می‌رود نه در مسیر.
 */

/** `CustomerListSortEnum`ِ بکند، بر اساسِ شناسه‌ی ستونِ جدول. */
export const CUSTOMER_SORT_COLUMNS = {
  id: 0,
  fullName: 2, // LAST_NAME
};

/** `GET GetCustomerList` — پارامترها از `listQuery` با همان نام‌های `GetCustomerListQuery`. */
export async function fetchCustomers(params) {
  const { data } = await axiosInstance.get("/Customer/GetCustomerList", { params });
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
