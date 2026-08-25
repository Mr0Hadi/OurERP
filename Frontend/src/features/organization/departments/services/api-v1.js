// src/features/organization/departments/services/api-v1.js
import axiosInstance from "@/shared/services/api/axios";
import { normalizeListResponse } from "@/shared/services/api/contract";

/**
 * نگاشت روی `api/Department` — این کنترلر در بکند **وجود دارد** و CRUD
 * کاملش پیاده شده.
 *
 * ⚠️ تنها چیزی که ندارد `DeputyId` است. تا اضافه‌شدنش، `deputyId` در
 * payload ارسال **نمی‌شود** (سند `docs/org-structure-contract.fa.md`);
 * فرستادنش فقط یک فیلد ناشناخته بود که سرور بی‌صدا دور می‌ریخت و این
 * بدترین حالت است — کاربر فکر می‌کند ذخیره شده.
 */
export async function fetchDepartments(params = {}) {
  const { data } = await axiosInstance.get("/Department/GetDepartmentList", {
    params: {
      page: params.page,
      take: params.limit,
      name: params.search || undefined,
    },
  });

  return normalizeListResponse(data, { itemsKey: "departmentList" });
}

export async function fetchDepartmentById(id) {
  const { data } = await axiosInstance.get("/Department/GetDepartmentDetail", {
    params: { id },
  });
  return data;
}

export async function createDepartment(payload) {
  const { data } = await axiosInstance.post("/Department/CreateDepartment", {
    name: payload.name,
    headId: payload.headId,
  });
  return data;
}

export async function updateDepartment(payload) {
  const { data } = await axiosInstance.put("/Department/UpdateDepartment", {
    id: payload.id,
    name: payload.name,
    headId: payload.headId,
  });
  return data;
}

/** حذف نرم — سرور فقط `IsActive` را false می‌کند. */
export async function deleteDepartment(id) {
  const { data } = await axiosInstance.delete("/Department/DeleteDepartment", {
    params: { id },
  });
  return data;
}
