import { useMemo } from "react";

import { useUserListQuery } from "@/features/employees/services/queries";
import { OrgRoleEnum } from "@/shared/domain/enums/orgRole";

const ALL_ROWS = { page: 1, take: 200 };

const nameOf = (user) =>
  `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.username;

/**
 * برچسبِ هر گزینه جایگاهِ *فعلیِ* کارمند را هم نشان می‌دهد، چون انتخابِ او
 * به‌عنوان مسئول یا جانشین منتقلش می‌کند و نقشِ فعلی‌اش را آزاد می‌کند —
 * کاربر باید پیش از انتخاب ببیند چه کسی را از کجا برمی‌دارد.
 */
function labelOf(user) {
  const placement = [user.departmentName, user.teamName]
    .filter(Boolean)
    .join(" / ");
  const role =
    user.role !== OrgRoleEnum.MEMBER && user.roleTitle
      ? ` (${user.roleTitle})`
      : "";
  const inactive = user.isActive ? "" : " · غیرفعال";

  return `${nameOf(user)}${placement ? ` — ${placement}` : ""}${role}${inactive}`;
}

/**
 * کارمندان به‌شکلِ options، برای انتخابِ مسئول و جانشینِ واحد و تیم.
 *
 * همه‌ی واحدها می‌آیند، نه فقط واحدِ همین تیم/واحد: سرور انتخاب‌شده را
 * خودش منتقل می‌کند (`IOrgRoleService.AssignAsync`)، پس محدودکردنِ فهرست
 * فقط یک مرحله‌ی دستیِ «اول کارمند را منتقل کن» را برمی‌گرداند.
 *
 * فقط کارمندان *فعال* پیشنهاد می‌شوند، با یک استثنا: `keepIds` — مقدارِ
 * فعلیِ فرم — تا اگر مقدار به کسی اشاره می‌کند، انتخابگر خالی به نظر نرسد.
 */
export function useEmployeeOptions({ keepIds = [] } = {}) {
  const { data, isLoading, isError } = useUserListQuery(ALL_ROWS);

  const keepKey = keepIds.filter((id) => id != null).join(",");

  const options = useMemo(() => {
    const keep = new Set(keepKey ? keepKey.split(",").map(Number) : []);

    return (data?.userList ?? [])
      .filter((user) => user.isActive || keep.has(user.id))
      .map((user) => ({ value: user.id, label: labelOf(user) }));
  }, [data, keepKey]);

  return { options, isLoading, isError };
}
