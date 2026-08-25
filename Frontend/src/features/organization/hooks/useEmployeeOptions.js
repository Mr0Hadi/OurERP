// src/features/organization/hooks/useEmployeeOptions.js
import { useMemo } from "react";

import { useEmployeesQuery } from "@/features/employees/services/queries";

const ALL_EMPLOYEES_PAGE = { pageIndex: 0, pageSize: 200 };
const BY_NAME = { id: "fullName", desc: false };

/**
 * فهرست کارمندان به‌شکلِ options، برای انتخاب مدیر و معاونِ واحد و تیم.
 *
 * فقط کارمندان *فعال* برگردانده می‌شوند: انتخاب کسی که دسترسی‌اش قطع
 * شده به‌عنوان مدیر یک واحد، یعنی آن واحد عملاً بی‌مدیر است ولی در UI
 * مدیر دارد.
 */
export function useEmployeeOptions() {
  const { data, isLoading, isError } = useEmployeesQuery(
    { globalSearch: "", roleId: "", status: "" },
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

/** نامِ نمایشیِ یک شناسه در فهرست options — برای پر کردن `headName`. */
export function labelOfOption(options, value) {
  if (value == null) return null;
  return options.find((option) => option.value === value)?.label ?? null;
}
