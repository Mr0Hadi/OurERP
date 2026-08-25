// src/features/organization/teams/services/api-mockData.js
import { applyListQuery } from "@/shared/services/mockQuery";
import { DEPARTMENT_LABELS } from "@/shared/domain/enums/department";
import { allTeams } from "./mockData";
import { allDepartments } from "../../departments/services/mockData";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const departmentNameOf = (departmentId) =>
  allDepartments.find((d) => d.id === departmentId)?.name ??
  DEPARTMENT_LABELS[departmentId] ??
  "—";

const withDerivedFields = (team, employees) => ({
  ...team,
  departmentName: departmentNameOf(team.departmentId),
  userCount: employees.filter((e) => e.teamId === team.id).length,
});

export async function fetchTeams(params = {}) {
  await delay(300);

  const { departmentId = "" } = params;
  const { allEmployees } = await import("@/features/employees/services/mockData");

  let rows = allTeams.map((team) => withDerivedFields(team, allEmployees));

  if (departmentId !== "" && departmentId != null) {
    rows = rows.filter((team) => team.departmentId === Number(departmentId));
  }

  return applyListQuery(rows, params, {
    searchFields: ["name", "departmentName", "headName"],
  });
}

export async function fetchTeamById(id) {
  await delay(300);

  const team = allTeams.find((item) => item.id == id);
  if (!team) throw new Error("تیم مورد نظر یافت نشد");

  const { allEmployees } = await import("@/features/employees/services/mockData");
  return withDerivedFields(team, allEmployees);
}

export async function createTeam(payload) {
  await delay(400);

  const duplicate = allTeams.some(
    (item) =>
      item.name === payload.name && item.departmentId === payload.departmentId,
  );
  if (duplicate) throw new Error("تیمی با این نام در این واحد قبلا ثبت شده است");

  const created = {
    id: Math.max(0, ...allTeams.map((item) => Number(item.id))) + 1,
    name: payload.name,
    departmentId: payload.departmentId,
    headId: payload.headId ?? null,
    headName: payload.headName ?? null,
    deputyId: payload.deputyId ?? null,
    deputyName: payload.deputyName ?? null,
    userCount: 0,
    isActive: true,
  };

  allTeams.push(created);
  return created;
}

export async function updateTeam(payload) {
  await delay(400);

  const index = allTeams.findIndex((item) => item.id == payload.id);
  if (index === -1) throw new Error("تیم مورد نظر یافت نشد");

  const duplicate = allTeams.some(
    (item) =>
      item.name === payload.name &&
      item.departmentId === payload.departmentId &&
      item.id != payload.id,
  );
  if (duplicate) throw new Error("تیمی با این نام در این واحد قبلا ثبت شده است");

  // مثل واحد: `deputyId` در payload نیست، پس مقدار فعلی حفظ می‌شود.
  allTeams[index] = {
    ...allTeams[index],
    name: payload.name,
    departmentId: payload.departmentId,
    headId: payload.headId ?? null,
    headName: payload.headName ?? null,
    ...("deputyId" in payload
      ? { deputyId: payload.deputyId, deputyName: payload.deputyName ?? null }
      : {}),
  };

  return allTeams[index];
}

export async function deleteTeam(id) {
  await delay(300);

  const team = allTeams.find((item) => item.id == id);
  if (!team) throw new Error("تیم مورد نظر یافت نشد");

  const { allEmployees } = await import("@/features/employees/services/mockData");
  const members = allEmployees.filter((e) => e.teamId == id && e.isActive);
  if (members.length > 0) {
    throw new Error(
      `این تیم ${members.length} عضو فعال دارد؛ اول آن‌ها را به تیم دیگری منتقل کنید.`,
    );
  }

  team.isActive = false;
  return { success: true, id };
}
