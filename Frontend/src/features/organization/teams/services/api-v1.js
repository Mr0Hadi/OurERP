// src/features/organization/teams/services/api-v1.js
import axiosInstance from "@/shared/services/api/axios";
import { normalizeListResponse } from "@/shared/services/api/contract";

/**
 * نگاشت روی `api/Team` — این کنترلر هم در بکند وجود دارد و CRUD کامل
 * دارد، با فیلتر `name` و `departmentId` روی فهرست.
 *
 * ⚠️ مثل واحد، `DeputyId` ندارد و ارسال نمی‌شود.
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
    headId: payload.headId,
  });
  return data;
}

export async function updateTeam(payload) {
  const { data } = await axiosInstance.put("/Team/UpdateTeam", {
    id: payload.id,
    name: payload.name,
    departmentId: payload.departmentId,
    headId: payload.headId,
  });
  return data;
}

export async function deleteTeam(id) {
  const { data } = await axiosInstance.delete("/Team/DeleteTeam", {
    params: { id },
  });
  return data;
}
