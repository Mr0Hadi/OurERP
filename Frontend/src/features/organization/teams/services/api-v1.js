import axiosInstance from "@/shared/services/api/axios";
import { normalizeListResponse } from "@/shared/services/api/contract";

/**
 * نگاشت روی `api/Team` — CRUD کامل (سند بکند، بخش ۳ج).
 *
 * - `GetTeamList` فقط تیم‌های فعال را برمی‌گرداند؛ فیلترهایش `name` و
 *   `departmentId` است. ردیفِ فهرست فقط *نامِ* مسئول و جانشین را دارد، نه
 *   شناسه‌شان، و `DepartmentId` هم ندارد — هر جا لازم باشد
 *   `GetTeamDetail` صدا زده می‌شود.
 * - `CreateTeam`/`UpdateTeam`: `headId`/`deputyId` وضعیتِ نهاییِ تیم‌اند.
 *   هر کسی که نامش بیاید به این تیم و واحدش منتقل می‌شود و نقشِ قبلی‌اش
 *   آزاد می‌شود؛ هر کسی که حذف شود عضوِ ساده‌ی همین تیم می‌ماند.
 * - تیم بین واحدها جابه‌جا نمی‌شود: `UpdateTeam` `departmentId` نمی‌گیرد.
 *
 * ⚠️ `CreateTeam` هیچ `data`ی برنمی‌گرداند (نه شناسه)، پس فرمِ مبدأ
 * نمی‌تواند تیمِ تازه را خودکار انتخاب کند.
 */
export async function fetchTeams(params = {}) {
  const { data } = await axiosInstance.get("/Team/GetTeamList", {
    params: {
      page: params.page,
      take: params.limit,
      name: params.search || undefined,
      departmentId: params.departmentId !== "" ? params.departmentId : undefined,
    },
  });

  return normalizeListResponse(data, { itemsKey: "teamList" });
}

export async function fetchTeamById(id) {
  const { data } = await axiosInstance.get("/Team/GetTeamDetail", {
    params: { id },
  });
  return data;
}

export async function createTeam(payload) {
  const { data } = await axiosInstance.post("/Team/CreateTeam", {
    name: payload.name,
    departmentId: payload.departmentId,
    headId: payload.headId ?? null,
    deputyId: payload.deputyId ?? null,
  });
  return data;
}

export async function updateTeam(payload) {
  const { data } = await axiosInstance.put("/Team/UpdateTeam", {
    id: payload.id,
    name: payload.name,
    headId: payload.headId ?? null,
    deputyId: payload.deputyId ?? null,
  });
  return data;
}

/** حذف نرم — سرور اگر تیم کارمند فعال داشته باشد ۴۰۰ می‌دهد. */
export async function deleteTeam(id) {
  const { data } = await axiosInstance.delete("/Team/DeleteTeam", {
    params: { id },
  });
  return data;
}
