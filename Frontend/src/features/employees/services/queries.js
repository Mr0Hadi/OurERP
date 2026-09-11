import { useQuery, keepPreviousData } from "@tanstack/react-query";

import { AccountStatusEnum } from "@/shared/domain/enums/accountStatus";
import { fetchEmployees, fetchEmployeeById } from "./api-v1";
import { employeeKeys } from "./queryKeys";

/** فهرست‌های داخلِ کارت‌ها (اعضای تیم، کاندیداها) صفحه‌بندی ندارند. */
const ALL_ROWS = { pageIndex: 0, pageSize: 200 };
const BY_NAME = { id: "fullName", desc: false };

/** فقط شمارنده می‌خواهیم، پس یک ردیف هم لازم نیست. */
const COUNT_ONLY = { pageIndex: 0, pageSize: 1 };

/**
 * @param queryOptions گزینه‌های اضافه‌ی react-query (مثلاً `enabled`) — برای
 *        فهرست‌هایی که تا انتخابِ یک واحد نباید درخواستی بزنند.
 */
export function useEmployeesQuery(filters, pagination, sorting, queryOptions = {}) {
  const queryParams = {
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    search: filters.globalSearch || "",
    personelCode: filters.personelCode || "",
    departmentId: filters.departmentId ?? "",
    teamId: filters.teamId ?? "",
    status: filters.status ?? "",
    sortBy: sorting?.id ?? "createdAt",
    sortOrder: sorting ? (sorting.desc ? "desc" : "asc") : "desc",
  };

  return useQuery({
    queryKey: employeeKeys.list(queryParams),
    queryFn: () => fetchEmployees(queryParams),
    placeholderData: keepPreviousData,
    ...queryOptions,
  });
}

export function useEmployeeQuery(id) {
  return useQuery({
    queryKey: employeeKeys.detail(id),
    queryFn: () => fetchEmployeeById(id),
    enabled: !!id,
  });
}

/**
 * تعداد کارمندانِ *فعالِ* یک واحد.
 *
 * از `total` صفحه‌بندی خوانده می‌شود، نه از `UserCount` رکوردِ واحد:
 * `GetDepartmentDetail` در سرور اصلاً شمارنده برنمی‌گرداند (فقط
 * `GetDepartmentList` دارد).
 *
 * فقط فعال‌ها شمرده می‌شوند چون `DeleteDepartment` فقط کارمندِ *فعال* را
 * مانع حذف می‌داند. قبلاً غیرفعال‌ها هم شمرده می‌شدند و واحدی که فقط
 * کارمندِ حذف‌شده داشت، از UI هیچ‌وقت قابل حذف نبود.
 */
export function useDepartmentUserCountQuery(departmentId) {
  const query = useEmployeesQuery(
    {
      globalSearch: "",
      departmentId: departmentId ?? "",
      status: AccountStatusEnum.ACTIVE,
    },
    COUNT_ONLY,
    null,
  );

  return { ...query, count: query.data?.total ?? 0 };
}

/**
 * اعضای یک تیم — برای کارتِ «اعضا» در صفحه‌ی جزئیات تیم.
 *
 * کارمندِ غیرفعال هم برمی‌گردد: او هنوز عضو تیم است و اگر از فهرست حذف
 * شود، مدیر تیم راهی برای خارج‌کردنش ندارد.
 */
export function useTeamMembersQuery(teamId) {
  const query = useEmployeesQuery(
    { globalSearch: "", teamId: teamId ?? "" },
    ALL_ROWS,
    BY_NAME,
  );

  return {
    ...query,
    members: query.data?.items ?? [],
    memberCount: query.data?.total ?? 0,
  };
}

/**
 * کارمندانی که می‌شود به یک تیم اضافه کرد: هر کسی که عضو *این* تیم
 * نیست و حسابش فعال است.
 *
 * فیلترش سمت کلاینت است چون سرور فیلترِ «بدون تیم» یا «به‌جز این تیم»
 * ندارد و ساختنش هم لازم نیست — فهرست کارمندان یک سازمان در همان یک
 * صفحه جا می‌شود.
 *
 * عمداً کارمندانِ تیم‌های دیگر هم می‌آیند: انتقال بین تیم‌ها یک کار
 * روزمره است و `ChangeUserTeam` دقیقاً برای همین ساخته شده.
 */
export function useTeamCandidatesQuery(teamId) {
  const query = useEmployeesQuery({ globalSearch: "" }, ALL_ROWS, BY_NAME);

  const candidates = (query.data?.items ?? []).filter(
    (employee) => employee.isActive && employee.teamId != teamId,
  );

  return { ...query, candidates };
}
