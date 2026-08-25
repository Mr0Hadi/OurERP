// src/features/organization/departments/services/api-mockData.js
import { applyListQuery } from "@/shared/services/mockQuery";
import { allDepartments } from "./mockData";
import { allTeams } from "../../teams/services/mockData";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** `teamCount` مشتق است — سرور هم آن را در `DepartmentListDto` می‌شمارد. */
const withTeamCount = (department) => {
  const teams = allTeams.filter((team) => team.departmentId === department.id);
  return { ...department, teamCount: teams.length };
};

export async function fetchDepartments(params = {}) {
  await delay(300);

  const rows = allDepartments.map(withTeamCount);

  return applyListQuery(rows, params, { searchFields: ["name", "headName"] });
}

export async function fetchDepartmentById(id) {
  await delay(300);

  const department = allDepartments.find((item) => item.id == id);
  if (!department) throw new Error("واحد مورد نظر یافت نشد");

  return withTeamCount(department);
}

export async function createDepartment(payload) {
  await delay(400);

  if (allDepartments.some((item) => item.name === payload.name)) {
    throw new Error("واحدی با این نام قبلا ثبت شده است");
  }

  const created = {
    id: Math.max(0, ...allDepartments.map((item) => Number(item.id))) + 1,
    name: payload.name,
    headId: payload.headId ?? null,
    headName: payload.headName ?? null,
    userCount: 0,
    isActive: true,
  };

  allDepartments.push(created);
  return created;
}

export async function updateDepartment(payload) {
  await delay(400);

  const index = allDepartments.findIndex((item) => item.id == payload.id);
  if (index === -1) throw new Error("واحد مورد نظر یافت نشد");

  const duplicate = allDepartments.some(
    (item) => item.name === payload.name && item.id != payload.id,
  );
  if (duplicate) throw new Error("واحدی با این نام قبلا ثبت شده است");

  allDepartments[index] = {
    ...allDepartments[index],
    name: payload.name,
    headId: payload.headId ?? null,
    headName: payload.headName ?? null,
  };

  return allDepartments[index];
}

export async function deleteDepartment(id) {
  await delay(300);

  const department = allDepartments.find((item) => item.id == id);
  if (!department) throw new Error("واحد مورد نظر یافت نشد");

  // واحدی که هنوز تیم فعال دارد نباید حذف شود؛ تیم‌هایش بی‌صاحب می‌مانند
  // و `Team.DepartmentId` در بکند غیرقابل‌null است.
  const activeTeams = allTeams.filter(
    (team) => team.departmentId == id && team.isActive,
  );
  if (activeTeams.length > 0) {
    throw new Error(
      `این واحد ${activeTeams.length} تیم فعال دارد؛ اول تیم‌ها را جابه‌جا یا حذف کنید.`,
    );
  }

  department.isActive = false;
  return { success: true, id };
}
