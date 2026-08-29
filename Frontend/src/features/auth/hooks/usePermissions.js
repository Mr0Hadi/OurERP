import { useCallback } from "react";
import { OrgPositionEnum } from "@/shared/domain/enums/orgHeadRole";
import { useActiveMembership } from "../services/queries";

/**
 * جایگاهِ سازمانیِ کاربر **در عضویتی که همین حالا انتخاب کرده**.
 *
 * چرا عضویتِ فعال و نه خودِ کاربر: قرار است یک نفر بتواند عضو چند واحد
 * باشد؛ آن‌وقت «سرپرست است یا نه» بدونِ مشخص‌کردنِ «سرپرستِ کجا» جواب
 * ندارد. سوییچرِ بالای سایدبار همان چیزی است که این را مشخص می‌کند.
 *
 * ⚠️ `hasPermission` امروز همیشه `false` می‌دهد: `GetUserInfo` فیلدِ
 * `Permissions` را دارد ولی خالی می‌فرستد (جدولِ `Roles` در migration
 * `remove-role` حذف شده و نگاشتش در `MappingProfile` کامنت است). عمداً
 * به‌جای `true` روی `false` می‌ماند — گاردی که در نبودِ داده باز شود،
 * گارد نیست. تا آن روز هیچ‌جا به‌عنوان گاردِ واقعی رویش حساب نکنید.
 */
export function usePermissions() {
  const { data: session, activeMembership, memberships } = useActiveMembership();

  const permissions = session?.permissions;

  const hasPermission = useCallback(
    (permission) => {
      if (!permissions?.length) return false;
      return permissions.includes("all") || permissions.includes(permission);
    },
    [permissions],
  );

  return {
    membership: activeMembership,
    memberships,
    hasPermission,

    isDepartmentHead: activeMembership?.departmentRole === OrgPositionEnum.HEAD,
    isDepartmentDeputy:
      activeMembership?.departmentRole === OrgPositionEnum.DEPUTY,
    isTeamHead: activeMembership?.teamRole === OrgPositionEnum.HEAD,
    isTeamDeputy: activeMembership?.teamRole === OrgPositionEnum.DEPUTY,
  };
}
