// src/features/organization/hooks/useOrgPosition.js
import { OrgPositionEnum } from "@/shared/domain/enums/orgPosition";

/**
 * جایگاه یک کارمند در واحد/تیمش را *مشتق* می‌کند.
 *
 * در بکند فیلدی به نام «جایگاه» روی `User` وجود ندارد و نباید هم داشته
 * باشد: منبع حقیقت `Department.HeadId` و `Team.HeadId` است. اگر جایگاه
 * روی خودِ کاربر ذخیره می‌شد، دو منبعِ حقیقت داشتیم که می‌توانند
 * ناهم‌خوان شوند — مثلاً کاربری که «مدیر» علامت خورده ولی `HeadId` واحد
 * کس دیگری است.
 *
 * ترتیب بررسی مهم است: مدیریتِ واحد از مدیریتِ تیم بالاتر است، پس اگر
 * کسی هم مدیر واحد باشد و هم مدیر یکی از تیم‌هایش، «مدیر واحد» نشان
 * داده می‌شود.
 */
export function resolveOrgPosition(employeeId, { department, team } = {}) {
  const member = { position: OrgPositionEnum.MEMBER, scope: null };
  if (employeeId == null) return member;

  const id = Number(employeeId);

  if (department?.headId === id) {
    return { position: OrgPositionEnum.HEAD, scope: "department" };
  }
  if (department?.deputyId === id) {
    return { position: OrgPositionEnum.DEPUTY, scope: "department" };
  }
  if (team?.headId === id) {
    return { position: OrgPositionEnum.HEAD, scope: "team" };
  }
  if (team?.deputyId === id) {
    return { position: OrgPositionEnum.DEPUTY, scope: "team" };
  }

  return member;
}
