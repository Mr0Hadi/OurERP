// src/features/organization/departments/services/api-mockData.js
import { applyListQuery } from "@/shared/services/mockQuery";
import { allDepartments } from "./mockData";
import { allTeams } from "../../teams/services/mockData";
import { allEmployees } from "@/features/employees/services/mockData";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const fullNameOf = (employee) =>
  `${employee.firstName ?? ""} ${employee.lastName ?? ""}`.trim() ||
  employee.username;

const employeeNameOf = (id) => {
  if (id == null) return null;
  const employee = allEmployees.find((item) => item.id == id);
  return employee ? fullNameOf(employee) : null;
};

/**
 * `headName`, `deputyName`, `teamCount` و `userCount` همه مشتق‌اند —
 * سرور هم آن‌ها را در `DepartmentListDto` با join می‌سازد.
 *
 * توجه: شمارنده‌ها فقط در DTOیِ *فهرستِ* سرور هستند؛ `DepartmentDto`
 * (جزئیات) آن‌ها را ندارد. صفحه‌ی جزئیات برای همین خودش می‌شمارد و به
 * این فیلدها تکیه نمی‌کند.
 */
const withDerivedFields = (department) => ({
  ...department,
  headName: employeeNameOf(department.headId),
  deputyName: employeeNameOf(department.deputyId),
  teamCount: allTeams.filter(
    (team) => team.departmentId === department.id && team.isActive !== false,
  ).length,
  userCount: allEmployees.filter(
    (employee) => employee.departmentId === department.id,
  ).length,
});

export async function fetchDepartments(params = {}) {
  await delay(300);

  const rows = allDepartments.map(withDerivedFields);

  return applyListQuery(rows, params, { searchFields: ["name", "headName"] });
}

export async function fetchDepartmentById(id) {
  await delay(300);

  const department = allDepartments.find((item) => item.id == id);
  if (!department) throw new Error("واحد مورد نظر یافت نشد");

  return withDerivedFields(department);
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
    deputyId: payload.deputyId ?? null,
    isActive: true,
  };

  allDepartments.push(created);
  return withDerivedFields(created);
}

export async function updateDepartment(payload) {
  await delay(400);

  const index = allDepartments.findIndex((item) => item.id == payload.id);
  if (index === -1) throw new Error("واحد مورد نظر یافت نشد");

  const duplicate = allDepartments.some(
    (item) => item.name === payload.name && item.id != payload.id,
  );
  if (duplicate) throw new Error("واحدی با این نام قبلا ثبت شده است");

  if (
    payload.headId != null &&
    payload.deputyId != null &&
    payload.headId === payload.deputyId
  ) {
    throw new Error("معاون نمی‌تواند همان مدیر باشد");
  }

  allDepartments[index] = {
    ...allDepartments[index],
    name: payload.name,
    headId: payload.headId ?? null,
    deputyId: payload.deputyId ?? null,
  };

  return withDerivedFields(allDepartments[index]);
}

export async function deleteDepartment(id) {
  await delay(300);

  const department = allDepartments.find((item) => item.id == id);
  if (!department) throw new Error("واحد مورد نظر یافت نشد");

  // همان دو قاعده‌ی `DeleteDepartmentCommand` در سرور، با همان پیام‌ها.
  const hasActiveTeams = allTeams.some(
    (team) => team.departmentId == id && team.isActive,
  );
  if (hasActiveTeams) {
    throw new Error("این واحد دارای تیم فعال است و قابل حذف نیست.");
  }

  const hasActiveUsers = allEmployees.some(
    (employee) => employee.departmentId == id && employee.isActive,
  );
  if (hasActiveUsers) {
    throw new Error("این واحد دارای کارمند فعال است و قابل حذف نیست.");
  }

  department.isActive = false;
  return { success: true, id };
}
