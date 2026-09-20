import { useQuery, keepPreviousData } from "@tanstack/react-query";

import { getTeamList, getTeamDetail } from "./api-v1";
import { teamKeys } from "./queryKeys";

const OPTIONS_TAKE = 200;

/**
 * فهرستِ تیم‌ها — `GetTeamList`.
 *
 * `params` همان پارامترهای سرور است (`page`, `take`, `name`,
 * `departmentId`) و پاسخ هم همان `{ teamList, page }`. این endpoint
 * مرتب‌سازی نمی‌گیرد.
 */
export function useTeamListQuery(params) {
  return useQuery({
    queryKey: teamKeys.list(params),
    queryFn: () => getTeamList(params),
    placeholderData: keepPreviousData,
  });
}

export function useTeamDetailQuery(id) {
  return useQuery({
    queryKey: teamKeys.detail(id),
    queryFn: () => getTeamDetail(id),
    enabled: !!id,
  });
}

/**
 * فهرست تیم‌ها برای پر کردن Select ها و کارت‌های داخلِ صفحه‌ی جزئیات.
 *
 * `departmentId` اختیاری است: فرم کارمند فقط تیم‌های واحدِ انتخاب‌شده را
 * می‌خواهد (تیمی که زیر واحد دیگری است، انتخابِ نامعتبری است)، ولی
 * فیلترِ فهرستِ کارمندان همه‌ی تیم‌ها را لازم دارد.
 *
 * `GetTeamList` خودش فقط تیم‌های فعال را برمی‌گرداند، پس فیلترِ دیگری
 * لازم نیست و فهرستِ خالی یعنی واقعاً تیمی تعریف نشده.
 */
export function useTeamOptionsQuery(departmentId = "") {
  const query = useQuery({
    queryKey: teamKeys.options(departmentId),
    queryFn: () =>
      getTeamList({
        page: 1,
        take: OPTIONS_TAKE,
        departmentId: departmentId ?? "",
      }),
  });

  return { ...query, teams: query.data?.teamList ?? [] };
}
