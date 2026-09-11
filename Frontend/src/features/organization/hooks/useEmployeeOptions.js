import { useMemo } from "react";

import { useEmployeesQuery } from "@/features/employees/services/queries";
import { OrgRoleEnum } from "@/shared/domain/enums/orgRole";

const ALL_EMPLOYEES_PAGE = { pageIndex: 0, pageSize: 200 };
const BY_NAME = { id: "fullName", desc: false };

const nameOf = (employee) =>
  `${employee.firstName ?? ""} ${employee.lastName ?? ""}`.trim() ||
  employee.username;

/**
 * برچسبِ هر گزینه جایگاهِ *فعلیِ* کارمند را هم نشان می‌دهد، چون انتخابِ او
 * به‌عنوان مسئول یا جانشین منتقلش می‌کند و نقشِ فعلی‌اش را آزاد می‌کند —
 * کاربر باید پیش از انتخاب ببیند چه کسی را از کجا برمی‌دارد.
 */
function labelOf(employee) {
  const placement = [employee.departmentName, employee.teamName]
    .filter(Boolean)
    .join(" / ");
  const role =
    employee.role !== OrgRoleEnum.MEMBER && employee.roleTitle
      ? ` (${employee.roleTitle})`
      : "";
  const inactive = employee.isActive ? "" : " · غیرفعال";

  return `${nameOf(employee)}${placement ? ` — ${placement}` : ""}${role}${inactive}`;
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
  const { data, isLoading, isError } = useEmployeesQuery(
    { globalSearch: "" },
    ALL_EMPLOYEES_PAGE,
    BY_NAME,
  );

  const keepKey = keepIds.filter((id) => id != null).join(",");

  const options = useMemo(() => {
    const keep = new Set(keepKey ? keepKey.split(",").map(Number) : []);

    return (data?.items ?? [])
      .filter((employee) => employee.isActive || keep.has(employee.id))
      .map((employee) => ({ value: employee.id, label: labelOf(employee) }));
  }, [data, keepKey]);

  return { options, isLoading, isError };
}
