// src/features/organization/hooks/useEmployeeOptions.js
import { useMemo } from "react";

import { useEmployeesQuery } from "@/features/employees/services/queries";

const ALL_EMPLOYEES_PAGE = { pageIndex: 0, pageSize: 200 };
const BY_NAME = { id: "fullName", desc: false };

/**
 * فهرست کارمندان به‌شکلِ options، برای انتخاب مدیرِ واحد و تیم.
 *
 * فقط کارمندان *فعال* برگردانده می‌شوند: انتخاب کسی که دسترسی‌اش قطع
 * شده به‌عنوان مدیر یک واحد، یعنی آن واحد عملاً بی‌مدیر است ولی در UI
 * مدیر دارد.
 *
 * `departmentId` اختیاری است و فهرست را به کارمندانِ همان واحد محدود
 * می‌کند — برای صفحه‌هایی که انتخابِ مدیر باید از میان اعضای خودِ واحد
 * باشد.
 */
export function useEmployeeOptions(departmentId = "") {
  const { data, isLoading, isError } = useEmployeesQuery(
    { globalSearch: "", departmentId },
    ALL_EMPLOYEES_PAGE,
    BY_NAME,
  );

  const options = useMemo(
    () =>
      (data?.items ?? [])
        .filter((employee) => employee.isActive)
        .map((employee) => ({
          value: employee.id,
          label:
            `${employee.firstName ?? ""} ${employee.lastName ?? ""}`.trim() ||
            employee.username,
        })),
    [data],
  );

  return { options, isLoading, isError };
}
