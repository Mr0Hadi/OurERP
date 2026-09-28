import axiosInstance from "@/shared/services/api/axios";
import { normalizeListResponse } from "@/shared/services/api/contract";

/**
 * لایه‌ی تماس با `api/Supplier` (بخش ۴ سند api-guide.fa.md).
 *
 * مسیرها REST نیستند: کنترلر با نامِ اکشن آدرس‌دهی می‌شود
 * (`GetSupplierList`, `CreateSupplier`, …) و برای ویرایش/حذف، شناسه در
 * بدنه یا query می‌رود نه در مسیر.
 */

/** `SupplierListSortEnum`ِ بکند، بر اساسِ شناسه‌ی ستونِ جدول. */
export const SUPPLIER_SORT_COLUMNS = {
  id: 0,
  companyName: 1,
  fullName: 3, // LAST_NAME
};

/** `GET GetSupplierList` — پارامترها از `listQuery` با همان نام‌های `GetSupplierListQuery`. */
export async function fetchSuppliers(params) {
  const { data } = await axiosInstance.get("/Supplier/GetSupplierList", { params });
  return normalizeListResponse(data, { itemsKey: "supplierList" });
}

export const getSupplierById = async (id) => {
  const { data } = await axiosInstance.get("/Supplier/GetSupplierDetail", {
    params: { id },
  });
  return data;
};

export async function createSupplier(supplierData) {
  const { data } = await axiosInstance.post(
    "/Supplier/CreateSupplier",
    supplierData,
  );
  return data;
}

/** شناسه در *بدنه* می‌رود، نه در مسیر — `UpdateSupplierCommand.Id`. */
export const updateSupplier = async (id, updatedData) => {
  const { data } = await axiosInstance.put("/Supplier/UpdateSupplier", {
    id,
    ...updatedData,
  });
  return data;
};

export const deleteSupplier = async (id) => {
  await axiosInstance.delete("/Supplier/DeleteSupplier", { params: { id } });
  return { success: true, id };
};
