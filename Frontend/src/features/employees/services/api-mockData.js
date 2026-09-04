// src/features/employees/services/api-mockData.js
import { applyListQuery } from "@/shared/services/mockQuery";
import { DEPARTMENT_LABELS } from "@/shared/domain/enums/department";
import {
  AccountStatusEnum,
  isActiveToAccountStatus,
} from "@/shared/domain/enums/accountStatus";
import { allEmployees } from "./mockData";
import { allDepartments } from "@/features/organization/departments/services/mockData";
import { allTeams } from "@/features/organization/teams/services/mockData";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * فیلدهایی که متن جست‌وجو روی آن‌ها تطبیق داده می‌شود — همان چهار فیلدی
 * که `GetUserListQuery` در سرور با `Contains` می‌گردد.
 */
const SEARCH_FIELDS = ["firstName", "lastName", "username", "personelCode"];

/**
 * نامِ واحد و تیم از خودِ رکوردِ واحد/تیم خوانده می‌شود، نه از کپیِ ذخیره‌شده
 * روی کارمند — سرور هم همین کار را با join می‌کند و کارمند فقط شناسه دارد.
 */
const departmentNameOf = (departmentId) =>
  allDepartments.find((item) => item.id === departmentId)?.name ??
  DEPARTMENT_LABELS[departmentId] ??
  null;

const teamNameOf = (teamId) =>
  allTeams.find((item) => item.id === teamId)?.name ?? null;

const withDerivedFields = (employee) => ({
  ...employee,
  fullName: `${employee.firstName} ${employee.lastName}`.trim(),
  status: isActiveToAccountStatus(employee.isActive),
  departmentName: departmentNameOf(employee.departmentId),
  teamName: teamNameOf(employee.teamId),
});

export async function fetchEmployees(params = {}) {
  await delay(400);

  const { status = "", departmentId = "", teamId = "" } = params;

  let rows = allEmployees.map(withDerivedFields);

  // فیلترهای دامنه‌ای اینجا می‌مانند؛ `applyListQuery` فقط جست‌وجو،
  // مرتب‌سازی و صفحه‌بندیِ عمومی را انجام می‌دهد.
  if (departmentId !== "" && departmentId != null) {
    rows = rows.filter(
      (employee) => employee.departmentId === Number(departmentId),
    );
  }

  if (teamId !== "" && teamId != null) {
    rows = rows.filter((employee) => employee.teamId === Number(teamId));
  }

  if (status !== "" && status != null) {
    const wantActive = Number(status) === AccountStatusEnum.ACTIVE;
    rows = rows.filter((employee) => employee.isActive === wantActive);
  }

  return applyListQuery(rows, params, {
    searchFields: SEARCH_FIELDS,
    dateField: "createdAt",
  });
}

export async function fetchEmployeeById(id) {
  await delay(400);

  const employee = allEmployees.find((item) => item.id == id);
  if (!employee) throw new Error("کارمند مورد نظر یافت نشد");

  return withDerivedFields(employee);
}

/**
 * کد پرسنلیِ خودکار — عددی پیوسته بعد از بزرگ‌ترین کدِ موجود.
 *
 * این کارِ **سرور** است، نه فرم: کد باید یکتا و بدون تصادم بماند و
 * کلاینت نمی‌تواند این را تضمین کند. تولیدش اینجا فقط برای این است که
 * mock همان چیزی را برگرداند که بعد از اصلاحِ `CreateUserCommand` از
 * سرور انتظار می‌رود.
 */
function nextPersonelCode() {
  const max = allEmployees.reduce((acc, item) => {
    const value = Number(item.personelCode);
    return Number.isFinite(value) && value > acc ? value : acc;
  }, 1000);

  return String(max + 1);
}

/** شناسه‌ی عددی یا null — Select گاهی رشته می‌دهد. */
const toId = (value) => (value === "" || value == null ? null : Number(value));

/** قاعده‌ی خودِ سرور: تیم باید زیرِ همان واحدِ کاربر باشد. */
function assertTeamBelongsToDepartment(teamId, departmentId) {
  if (teamId == null) return;

  const team = allTeams.find((item) => item.id === teamId);
  if (!team) throw new Error("تیم انتخاب شده یافت نشد");
  if (team.departmentId !== departmentId) {
    throw new Error("تیم انتخاب شده متعلق به این واحد نیست");
  }
}

export async function createEmployee(payload) {
  await delay(500);

  if (allEmployees.some((item) => item.username === payload.username)) {
    throw new Error("کاربری با این نام کاربری قبلا ثبت شده است");
  }

  const departmentId = toId(payload.departmentId);
  const teamId = toId(payload.teamId);

  if (!allDepartments.some((item) => item.id === departmentId)) {
    throw new Error("واحد انتخاب شده یافت نشد");
  }
  assertTeamBelongsToDepartment(teamId, departmentId);

  const newId = allEmployees.length
    ? Math.max(...allEmployees.map((item) => Number(item.id))) + 1
    : 1;

  const created = {
    id: newId,
    firstName: payload.fisrtName ?? payload.firstName,
    lastName: payload.lastName,
    username: payload.username,
    personelCode: nextPersonelCode(),
    departmentId,
    teamId,
    isActive: true,
    createdAt: new Date().toISOString(),
  };

  allEmployees.push(created);
  return withDerivedFields(created);
}

export async function updateEmployee(payload) {
  await delay(500);

  const index = allEmployees.findIndex((item) => item.id == payload.id);
  if (index === -1) throw new Error("کارمند مورد نظر یافت نشد");

  const duplicate = allEmployees.some(
    (item) => item.username === payload.username && item.id != payload.id,
  );
  if (duplicate) throw new Error("کاربری با این نام کاربری قبلا ثبت شده است");

  const departmentId = toId(payload.departmentId);
  const teamId = toId(payload.teamId);

  if (!allDepartments.some((item) => item.id === departmentId)) {
    throw new Error("واحد انتخاب شده یافت نشد");
  }
  assertTeamBelongsToDepartment(teamId, departmentId);

  allEmployees[index] = {
    ...allEmployees[index],
    firstName: payload.firstName,
    lastName: payload.lastName,
    username: payload.username,
    departmentId,
    teamId,
    isActive: payload.isActive,
  };

  return withDerivedFields(allEmployees[index]);
}

/**
 * آینه‌ی `ChangeUserTeamCommand` — عضویت و سرپرستیِ تیم را با هم
 * جابه‌جا می‌کند.
 *
 * ترتیبِ کارها دقیقاً همان هندلرِ سرور است: اول سرپرستیِ تیمِ *قبلی* باز
 * می‌شود (اگر این کاربر مدیرش بوده)، بعد عضویت نوشته می‌شود، و آخر
 * سرپرستیِ تیمِ جدید بر اساس `isHead` ست یا پاک می‌شود.
 */
export async function assignEmployeeMembership({
  userId,
  departmentId,
  teamId,
  isHead = false,
}) {
  await delay(400);

  const index = allEmployees.findIndex((item) => item.id == userId);
  if (index === -1) throw new Error("کاربر مورد نظر یافت نشد");

  const nextDepartmentId = toId(departmentId);
  const nextTeamId = toId(teamId);

  if (!allDepartments.some((item) => item.id === nextDepartmentId)) {
    throw new Error("واحد انتخاب شده یافت نشد");
  }
  assertTeamBelongsToDepartment(nextTeamId, nextDepartmentId);

  const employee = allEmployees[index];

  if (employee.teamId != null && employee.teamId !== nextTeamId) {
    const previousTeam = allTeams.find((item) => item.id === employee.teamId);
    if (previousTeam && previousTeam.headId === employee.id) {
      previousTeam.headId = null;
    }
  }

  allEmployees[index] = {
    ...employee,
    departmentId: nextDepartmentId,
    teamId: nextTeamId,
  };

  const team = allTeams.find((item) => item.id === nextTeamId);
  if (team) {
    if (isHead) team.headId = employee.id;
    else if (team.headId === employee.id) team.headId = null;
  }

  return withDerivedFields(allEmployees[index]);
}

/** حذف نرم — دقیقاً مثل سرور فقط `isActive` را false می‌کند. */
export async function removeEmployee(id) {
  await delay(400);

  const employee = allEmployees.find((item) => item.id == id);
  if (!employee) throw new Error("کارمند مورد نظر یافت نشد");

  employee.isActive = false;
  return { success: true, id };
}

export async function logoutEmployee(id) {
  await delay(300);
  return { success: true, id };
}
