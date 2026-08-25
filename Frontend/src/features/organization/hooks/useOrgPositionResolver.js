// src/features/organization/hooks/useOrgPositionResolver.js
import { useCallback, useMemo } from "react";

import { useDepartmentsQuery } from "../departments/services/queries";
import { useAllTeamsQuery } from "../teams/services/queries";
import { resolveOrgPosition } from "./useOrgPosition";

const ALL_PAGE = { pageIndex: 0, pageSize: 200 };
const BY_NAME = { id: "name", desc: false };

/**
 * تابعی برمی‌گرداند که جایگاه هر کارمند را از روی واحد و تیمش حساب
 * می‌کند.
 *
 * چرا یک resolver و نه یک فیلد روی خودِ کارمند: جایگاه *مشتق* است
 * (`Department.HeadId` / `Team.HeadId`) و اگر روی کاربر ذخیره شود دو
 * منبع حقیقت داریم. جزئیاتش در `useOrgPosition` توضیح داده شده.
 *
 * واحدها و تیم‌ها یک بار گرفته و در Map ایندکس می‌شوند تا جدولِ ۵۰
 * ردیفی، ۱۰۰ بار آرایه را پیمایش نکند.
 */
export function useOrgPositionResolver() {
  const { data: departmentsData } = useDepartmentsQuery(
    { globalSearch: "" },
    ALL_PAGE,
    BY_NAME,
  );
  const { teams } = useAllTeamsQuery();

  const departmentsById = useMemo(() => {
    const map = new Map();
    for (const department of departmentsData?.items ?? []) {
      map.set(department.id, department);
    }
    return map;
  }, [departmentsData]);

  const teamsById = useMemo(() => {
    const map = new Map();
    for (const team of teams) map.set(team.id, team);
    return map;
  }, [teams]);

  return useCallback(
    (employee) =>
      resolveOrgPosition(employee?.id, {
        department: departmentsById.get(employee?.departmentId),
        team: teamsById.get(employee?.teamId),
      }),
    [departmentsById, teamsById],
  );
}
