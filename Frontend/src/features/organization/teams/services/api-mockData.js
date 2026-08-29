// src/features/organization/teams/services/api-mockData.js
import { applyListQuery } from "@/shared/services/mockQuery";
import { DEPARTMENT_LABELS } from "@/shared/domain/enums/department";
import { allTeams } from "./mockData";
import { allDepartments } from "../../departments/services/mockData";
import { allEmployees } from "@/features/employees/services/mockData";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const departmentNameOf = (departmentId) =>
  allDepartments.find((d) => d.id === departmentId)?.name ??
  DEPARTMENT_LABELS[departmentId] ??
  "—";

const fullNameOf = (employee) =>
  `${employee.firstName ?? ""} ${employee.lastName ?? ""}`.trim() ||
  employee.username;

const employeeNameOf = (id) => {
  if (id == null) return null;
  const employee = allEmployees.find((item) => item.id == id);
  return employee ? fullNameOf(employee) : null;
};

/**
 * نام واحد، نام مدیر و معاون و تعداد اعضا همه مشتق‌اند (سرور: join).
 *
 * توجه: `TeamListDto` سرور `headId`/`deputyId`/`departmentId` را
 * **برنمی‌گرداند**؛ اینجا برمی‌گردند چون mock یک آبجکت است نه یک DTO.
 * هیچ صفحه‌ای نباید روی وجودشان در ردیفِ *فهرست* حساب کند — هر جا لازم
 * شد، `fetchTeamById` صدا زده می‌شود.
 */
const withDerivedFields = (team) => ({
  ...team,
  departmentName: departmentNameOf(team.departmentId),
  headName: employeeNameOf(team.headId),
  deputyName: employeeNameOf(team.deputyId),
  userCount: allEmployees.filter((employee) => employee.teamId === team.id)
    .length,
});

export async function fetchTeams(params = {}) {
  await delay(300);

  const { departmentId = "" } = params;

  let rows = allTeams.map(withDerivedFields);

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

  return withDerivedFields(team);
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
    departmentId: Number(payload.departmentId),
    headId: payload.headId ?? null,
    deputyId: payload.deputyId ?? null,
    isActive: true,
  };

  allTeams.push(created);
  return withDerivedFields(created);
}

export async function updateTeam(payload) {
  await delay(400);

  const index = allTeams.findIndex((item) => item.id == payload.id);
  if (index === -1) throw new Error("تیم مورد نظر یافت نشد");

  const duplicate = allTeams.some(
    (item) =>
      item.name === payload.name &&
      item.departmentId === Number(payload.departmentId) &&
      item.id != payload.id,
  );
  if (duplicate) throw new Error("تیمی با این نام در این واحد قبلا ثبت شده است");

  if (
    payload.headId != null &&
    payload.deputyId != null &&
    payload.headId === payload.deputyId
  ) {
    throw new Error("معاون نمی‌تواند همان مدیر باشد");
  }

  // عمداً واحدِ *اعضا* دست نمی‌خورد: `UpdateTeamCommand` در سرور هم این
  // کار را نمی‌کند. اگر mock اعضا را جابه‌جا کند، رفتار دو لایه فرق
  // می‌کند و باگِ سمت سرور در توسعه دیده نمی‌شود.
  allTeams[index] = {
    ...allTeams[index],
    name: payload.name,
    departmentId: Number(payload.departmentId),
    headId: payload.headId ?? null,
    deputyId: payload.deputyId ?? null,
  };

  return withDerivedFields(allTeams[index]);
}

/**
 * انتقال یک تیمِ موجود به یک واحد — همان `UpdateTeam`، فقط با نامی که
 * صفحه‌ی جزئیات واحد می‌فهمد.
 *
 * رکورد کامل از `fetchTeamById` گرفته می‌شود، نه از ردیفِ فهرست: در
 * سرور `TeamListDto` شناسه‌ی مدیر و معاون را ندارد و فرستادنِ ردیفِ
 * فهرست به `UpdateTeam` هر دو را پاک می‌کند.
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

export async function deleteTeam(id) {
  await delay(300);

  const team = allTeams.find((item) => item.id == id);
  if (!team) throw new Error("تیم مورد نظر یافت نشد");

  // همان قاعده‌ی `DeleteTeamCommand`: تیمی که عضو فعال دارد حذف نمی‌شود.
  // عضویت‌ها هم باز نمی‌شوند — سرور این کار را نمی‌کند.
  const hasActiveUsers = allEmployees.some(
    (employee) => employee.teamId == id && employee.isActive,
  );
  if (hasActiveUsers) {
    throw new Error("این تیم دارای کارمند فعال است و قابل حذف نیست.");
  }

  team.isActive = false;
  return { success: true, id };
}
