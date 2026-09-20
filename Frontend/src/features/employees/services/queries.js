import { useQuery, keepPreviousData } from "@tanstack/react-query";

import { getUserList, getUserUpdate } from "./api-v1";
import { userKeys } from "./queryKeys";

/** فهرست‌های داخلِ کارت‌ها (اعضای تیم، کاندیداها) صفحه‌بندی ندارند. */
const ALL_ROWS = { page: 1, take: 200 };

/** فقط شمارنده می‌خواهیم، پس یک ردیف هم لازم نیست. */
const COUNT_ONLY = { page: 1, take: 1 };

/**
 * فهرستِ کارمندان — `GetUserList`.
 *
 * `params` دقیقاً همان چیزی است که سرور می‌گیرد: `page`, `take`,
 * `fullName`, `personelCode`, `departmentId`, `teamId`, `isActive`. هیچ
 * نامی ترجمه نمی‌شود و پاسخ هم همان `{ userList, page }` سرور است.
 *
 * ⚠️ `GetUserList` مرتب‌سازی نمی‌گیرد؛ ترتیبِ ردیف‌ها را سرور تعیین می‌کند.
 *
 * @param queryOptions گزینه‌های اضافه‌ی react-query (مثلاً `enabled`) — برای
 *        فهرست‌هایی که تا انتخابِ یک واحد نباید درخواستی بزنند.
 */
export function useUserListQuery(params, queryOptions = {}) {
  return useQuery({
    queryKey: userKeys.list(params),
    queryFn: () => getUserList(params),
    placeholderData: keepPreviousData,
    ...queryOptions,
  });
}

export function useUserUpdateQuery(id) {
  return useQuery({
    queryKey: userKeys.detail(id),
    queryFn: () => getUserUpdate(id),
    enabled: !!id,
  });
}

/**
 * تعداد کارمندانِ *فعالِ* یک واحد.
 *
 * از `page.total` خوانده می‌شود، نه از `userCount` رکوردِ واحد:
 * `GetDepartmentDetail` در سرور اصلاً شمارنده برنمی‌گرداند (فقط
 * `GetDepartmentList` دارد).
 *
 * فقط فعال‌ها شمرده می‌شوند چون `DeleteDepartment` فقط کارمندِ *فعال* را
 * مانع حذف می‌داند. قبلاً غیرفعال‌ها هم شمرده می‌شدند و واحدی که فقط
 * کارمندِ حذف‌شده داشت، از UI هیچ‌وقت قابل حذف نبود.
 */
export function useDepartmentUserCountQuery(departmentId) {
  const query = useUserListQuery({
    ...COUNT_ONLY,
    departmentId: departmentId ?? "",
    isActive: true,
  });

  return { ...query, userCount: query.data?.page?.total ?? 0 };
}

/**
 * اعضای یک تیم — برای کارتِ «اعضا» در صفحه‌ی جزئیات تیم.
 *
 * کارمندِ غیرفعال هم برمی‌گردد: او هنوز عضو تیم است و اگر از فهرست حذف
 * شود، مدیر تیم راهی برای خارج‌کردنش ندارد.
 */
export function useTeamMembersQuery(teamId) {
  const query = useUserListQuery({ ...ALL_ROWS, teamId: teamId ?? "" });

  const members = query.data?.userList ?? [];

  return {
    ...query,
    members,
    // شمارنده فقط فعال‌ها را می‌شمارد - همان چیزی که `TeamListDto.UserCount`
    // می‌دهد و همان شرطی که `DeleteTeam` برای «آیا این تیم هنوز عضوی دارد»
    // می‌گذارد. `page.total` این‌جا کار نمی‌کند چون خودِ فهرست عمداً
    // غیرفعال‌ها را هم می‌آورد.
    activeMemberCount: members.filter((user) => user.isActive).length,
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
  const query = useUserListQuery({ ...ALL_ROWS, isActive: true });

  const candidates = (query.data?.userList ?? []).filter(
    (user) => user.teamId != teamId,
  );

  return { ...query, candidates };
}
