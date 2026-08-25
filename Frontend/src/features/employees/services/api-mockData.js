// src/features/employees/services/api-mockData.js
import { applyListQuery } from "@/shared/services/mockQuery";
import { USER_ROLE_LABELS } from "@/shared/domain/enums/userRole";
import { allEmployees } from "./mockData";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * فیلدهایی که متن جست‌وجو روی آن‌ها تطبیق داده می‌شود. `fullName` مشتق
 * است، پس قبل از `applyListQuery` ساخته می‌شود.
 */
const SEARCH_FIELDS = ["fullName", "username", "personelCode"];

const withDerivedFields = (employee) => ({
  ...employee,
  fullName: `${employee.firstName} ${employee.lastName}`.trim(),
});

export async function fetchEmployees(params = {}) {
  await delay(400);

  const { roleId = "", isActive = "" } = params;

  let rows = allEmployees.map(withDerivedFields);

  // فیلترهای دامنه‌ای اینجا می‌مانند؛ `applyListQuery` فقط جست‌وجو،
  // مرتب‌سازی و صفحه‌بندیِ عمومی را انجام می‌دهد.
  if (roleId !== "" && roleId != null) {
    rows = rows.filter((employee) => employee.roleId === Number(roleId));
  }

  if (isActive !== "" && isActive != null) {
    // مقدار از Select می‌آید و رشته است؛ "1" یعنی فعال.
    const wanted = String(isActive) === "1";
    rows = rows.filter((employee) => employee.isActive === wanted);
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

export async function createEmployee(payload) {
  await delay(500);

  if (allEmployees.some((item) => item.username === payload.username)) {
    throw new Error("کاربری با این نام کاربری قبلا ثبت شده است");
  }

  const newId = allEmployees.length
    ? Math.max(...allEmployees.map((item) => Number(item.id))) + 1
    : 1;

  const created = {
    id: newId,
    firstName: payload.fisrtName ?? payload.firstName,
    lastName: payload.lastName,
    username: payload.username,
    personelCode: payload.personelCode,
    roleId: payload.roleId,
    roleName: USER_ROLE_LABELS[payload.roleId] ?? "",
    isActive: true,
    createdAt: new Date().toISOString(),
  };

  allEmployees.push(created);
  return created;
}

export async function updateEmployee(payload) {
  await delay(500);

  const index = allEmployees.findIndex((item) => item.id == payload.id);
  if (index === -1) throw new Error("کارمند مورد نظر یافت نشد");

  const duplicate = allEmployees.some(
    (item) => item.username === payload.username && item.id != payload.id,
  );
  if (duplicate) throw new Error("کاربری با این نام کاربری قبلا ثبت شده است");

  allEmployees[index] = {
    ...allEmployees[index],
    firstName: payload.firstName,
    lastName: payload.lastName,
    username: payload.username,
    roleId: payload.roleId,
    roleName: USER_ROLE_LABELS[payload.roleId] ?? "",
    isActive: payload.isActive,
  };

  return allEmployees[index];
}

/** حذف نرم — دقیقاً مثل سرور فقط `isActive` را false می‌کند. */
export async function deactivateEmployee(id) {
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
