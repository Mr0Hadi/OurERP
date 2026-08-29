// src/features/organization/departments/services/api-v1.js
import axiosInstance from "@/shared/services/api/axios";
import { normalizeListResponse } from "@/shared/services/api/contract";

/**
 * نگاشت روی `api/Department` — این کنترلر در بکند وجود دارد و CRUD
 * کاملش پیاده شده.
 *
 * `deputyId` (معاون) هم فرستاده می‌شود، چون هندلرهای `Create`/`Update`
 * بی‌قید `department.DeputyId = request.DeputyId` می‌گذارند: نفرستادنش
 * معاونِ ثبت‌شده را در هر ذخیره پاک می‌کند.
 *
 * ⚠️ دو چیزی که سرور هنوز برنمی‌گرداند و صفحه‌ها ناچار خودشان می‌سازند:
 *   `IsActive`  — نه در `DepartmentListDto` هست و نه در `DepartmentDto`،
 *                 و `GetDepartmentList` هم رویش فیلتر نمی‌کند. یعنی واحدِ
 *                 حذف‌شده در فهرست‌ها می‌ماند. گاردِ فرانت (`isActive !==
 *                 false`) تا آن روز بی‌اثر ولی بی‌ضرر است.
 *   شمارنده‌ها  — `TeamCount`/`UserCount` فقط در DTOیِ *فهرست* هستند، نه
 *                 در جزئیات؛ صفحه‌ی جزئیات آن‌ها را از فهرست تیم‌ها و
 *                 `GetUserList` می‌شمارد.
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
    headId: payload.headId ?? null,
    deputyId: payload.deputyId ?? null,
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
