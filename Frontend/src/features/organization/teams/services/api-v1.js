// src/features/organization/teams/services/api-v1.js
import axiosInstance from "@/shared/services/api/axios";
import { normalizeListResponse } from "@/shared/services/api/contract";

/**
 * نگاشت روی `api/Team` — CRUD کامل، با فیلتر `name` و `departmentId`
 * روی فهرست.
 *
 * `deputyId` مثل واحد همیشه فرستاده می‌شود، وگرنه `UpdateTeamCommand`
 * معاون را پاک می‌کند.
 *
 * ⚠️ `TeamListDto` فقط *نام* مدیر و معاون را دارد، نه شناسه‌شان — و
 * `IsActive` و `DepartmentId` هم ندارد. هر جا به این‌ها نیاز باشد باید
 * `GetTeamDetail` صدا زده شود، نه اینکه از ردیفِ فهرست حدس زده شود.
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
    departmentId: payload.departmentId,
    headId: payload.headId ?? null,
    deputyId: payload.deputyId ?? null,
  });
  return data;
}

/**
 * انتقال یک تیمِ موجود به یک واحد (از صفحه‌ی جزئیات واحد).
 *
 * سرور دستور اختصاصی ندارد و این هم همان `UpdateTeam` است — که **کل
 * رکورد را بازنویسی می‌کند**. برای همین اول `GetTeamDetail` صدا زده
 * می‌شود: ردیفِ فهرست `headId`/`deputyId` ندارد و اگر همان را
 * می‌فرستادیم، انتقالِ تیم مدیر و معاونش را بی‌صدا پاک می‌کرد.
 *
 * ⚠️ سرور واحدِ *اعضای* تیم را با تیم جابه‌جا نمی‌کند؛ تا وقتی
 * `UpdateTeamCommand` این را انجام ندهد، اعضا در واحد قبلی می‌مانند.
 */
export async function assignTeamToDepartment({ teamId, departmentId }) {
  const team = await fetchTeamById(teamId);

  return updateTeam({
    id: teamId,
    name: team.name,
    departmentId,
    headId: team.headId ?? null,
    deputyId: team.deputyId ?? null,
  });
}

/** حذف نرم — سرور اگر تیم کارمند فعال داشته باشد ۴۰۰ می‌دهد. */
export async function deleteTeam(id) {
  const { data } = await axiosInstance.delete("/Team/DeleteTeam", {
    params: { id },
  });
  return data;
}
