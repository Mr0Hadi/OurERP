// src/features/suppliers/services/api-v1.js
import axiosInstance from "@/shared/services/api/axios";
import { normalizeListResponse } from "@/shared/services/api/contract";

/**
 * لایه‌ی تماس با `api/Supplier` (بخش ۴ سند api-guide.fa.md).
 *
 * مسیرها REST نیستند: کنترلر با نامِ اکشن آدرس‌دهی می‌شود
 * (`GetSupplierList`, `CreateSupplier`, …) و برای ویرایش/حذف، شناسه در
 * بدنه یا query می‌رود نه در مسیر.
 *
 * نامِ پارامترهای فیلتر هم فرق دارد و باید همان‌ها فرستاده شود، وگرنه
 * فیلتر بی‌صدا نادیده گرفته می‌شود:
 * `companyNameOrContactName`, `fromBalance`, `toBalance`, `balanceType`.
 * مرتب‌سازی را سرور اصلاً پشتیبانی نمی‌کند.
 */
export async function fetchSuppliers({
  page = 1,
  limit = 10,
  search = "",
  minBalance = "",
  maxBalance = "",
  balanceType = "",
} = {}) {
  const { data } = await axiosInstance.get("/Supplier/GetSupplierList", {
    params: {
      page,
      take: limit,
      companyNameOrContactName: search || undefined,
      fromBalance: minBalance !== "" ? minBalance : undefined,
      toBalance: maxBalance !== "" ? maxBalance : undefined,
      balanceType: balanceType !== "" ? balanceType : undefined,
    },
  });

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
