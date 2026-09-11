import axiosInstance from "@/shared/services/api/axios";
import { normalizeListResponse } from "@/shared/services/api/contract";

/**
 * نگاشت روی `api/Department` — CRUD کامل.
 *
 * - `GetDepartmentList` فقط واحدهای فعال را برمی‌گرداند و دو فیلترِ
 *   *مستقل* دارد: `name` و `headName` (هر دو با هم AND می‌شوند، پس یک
 *   کادرِ جست‌وجوی مشترک نمی‌تواند هر دو را پر کند).
 * - `CreateDepartment` فقط `name` می‌گیرد؛ هر `headId`/`deputyId` را رد
 *   می‌کند چون مدیر باید عضوِ همان واحد باشد.
 * - `UpdateDepartment` بی‌قید `DeputyId = request.DeputyId` می‌گذارد، پس
 *   `deputyId` همیشه فرستاده می‌شود.
 *
 * ⚠️ شمارنده‌ها (`TeamCount`/`UserCount`) فقط در DTOیِ *فهرست* هستند، نه
 * در جزئیات؛ صفحه‌ی جزئیات آن‌ها را از فهرست تیم‌ها و `GetUserList`
 * می‌شمارد.
 */
export async function fetchDepartments(params = {}) {
  const { data } = await axiosInstance.get("/Department/GetDepartmentList", {
    params: {
      page: params.page,
      take: params.limit,
      name: params.search || undefined,
      headName: params.headName || undefined,
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

/** پاسخ باید رکوردِ ساخته‌شده (دست‌کم `id`) باشد تا فرمِ مبدأ انتخابش کند. */
export async function createDepartment(payload) {
  const { data } = await axiosInstance.post("/Department/CreateDepartment", {
    name: payload.name,
  });
  return data;
}

export async function updateDepartment(payload) {
  const { data } = await axiosInstance.put("/Department/UpdateDepartment", {
    id: payload.id,
    name: payload.name,
    headId: payload.headId ?? null,
    deputyId: payload.deputyId ?? null,
  });
  return data;
}

/**
 * حذف نرم — سرور فقط `IsActive` را false می‌کند، و اگر واحد تیم فعال
 * **یا کارمند فعال** داشته باشد ۴۰۰ می‌دهد.
 */
export async function deleteDepartment(id) {
  const { data } = await axiosInstance.delete("/Department/DeleteDepartment", {
    params: { id },
  });
  return data;
}
