import axiosInstance from "@/shared/services/api/axios";

/**
 * نگاشت روی `api/Department` — CRUD کامل، با همان نام‌های بکند.
 *
 * - `GetDepartmentList` فقط واحدهای فعال را برمی‌گرداند و دو فیلترِ
 *   *مستقل* دارد: `name` و `headName` (با هم AND می‌شوند). پاسخ همان
 *   `{ departmentList, page: { page, pageCount, take, total } }` سرور است.
 * - `CreateDepartment`/`UpdateDepartment`: `headId`/`deputyId` وضعیتِ
 *   نهاییِ واحدند. هر کسی که نامش بیاید به این واحد منتقل و از تیمش خارج
 *   می‌شود (مسئول/جانشینِ واحد عضو هیچ تیمی نیست) و نقشِ قبلی‌اش آزاد
 *   می‌شود؛ هر کسی که حذف شود عضوِ ساده‌ی همین واحد می‌ماند. پس
 *   `deputyId` همیشه فرستاده می‌شود.
 *
 * ⚠️ شمارنده‌ها (`teamCount`/`userCount`) فقط در `DepartmentListDto` هستند،
 *   نه در `DepartmentDto`؛ صفحه‌ی جزئیات آن‌ها را از فهرست تیم‌ها و
 *   `GetUserList` می‌شمارد.
 *
 * ⚠️ `CreateDepartment` هیچ `Data`ی برنمی‌گرداند (نه شناسه)، پس فرمِ مبدأ
 *   نمی‌تواند واحدِ تازه را خودکار انتخاب کند.
 */

/** فیلترِ خالی نباید روی سیم برود. */
const filterValue = (value) =>
  value === "" || value == null ? undefined : value;

export async function getDepartmentList(params = {}) {
  const { data } = await axiosInstance.get("/Department/GetDepartmentList", {
    params: {
      page: params.page,
      take: params.take,
      name: filterValue(params.name),
      headName: filterValue(params.headName),
    },
  });

  return data;
}

export async function getDepartmentDetail(id) {
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
