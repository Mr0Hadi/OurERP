import { useMemo } from "react";

import { useEmployeesQuery } from "@/features/employees/services/queries";

const ALL_EMPLOYEES_PAGE = { pageIndex: 0, pageSize: 200 };
const BY_NAME = { id: "fullName", desc: false };

const nameOf = (employee) =>
  `${employee.firstName ?? ""} ${employee.lastName ?? ""}`.trim() ||
  employee.username;

/**
 * کارمندانِ یک واحد به‌شکلِ options، برای انتخاب مدیر و معاونِ واحد و تیم.
 *
 * `departmentId` **اجباری** است: سرور در `CreateTeam`، `UpdateTeam` و
 * `UpdateDepartment` چک می‌کند که مدیر و معاون عضو همان واحد باشند. نشان
 * دادنِ کارمندانِ واحدهای دیگر فقط راهی بود برای گرفتنِ ۴۰۰. بدون واحد
 * (null/خالی) هیچ درخواستی نمی‌رود و فهرست خالی است.
 *
 * فقط کارمندان *فعال* پیشنهاد می‌شوند، با یک استثنا: `keepIds` — مقدارِ
 * فعلیِ فرم. اگر مدیرِ ثبت‌شده غیرفعال شده باشد، باید با برچسبِ
 * «غیرفعال» دیده شود، نه اینکه انتخابگر خالی به نظر برسد در حالی که
 * مقدار دارد.
 *
 * شناسه‌ای از `keepIds` که اصلاً عضو این واحد نیست (مثلاً کارمند بعد از
 * انتصاب به واحد دیگری منتقل شده) با `outsider: true` برمی‌گردد تا فرم
 * بتواند پیش از ذخیره جلویش را بگیرد — سرور آن را رد می‌کند.
 */
export function useEmployeeOptions(departmentId, { keepIds = [] } = {}) {
  const enabled = departmentId != null && departmentId !== "";

  const { data, isLoading, isPlaceholderData, isError } = useEmployeesQuery(
    { globalSearch: "", departmentId: enabled ? departmentId : "" },
    ALL_EMPLOYEES_PAGE,
    BY_NAME,
    { enabled },
  );

  // داده‌ی placeholder مالِ واحدِ *قبلی* است؛ تا پاسخِ واحدِ جدید نیامده،
  // «در حال بارگذاری» حساب می‌شود، نه فهرستِ معتبر.
  const loading = enabled && (isLoading || isPlaceholderData);

  const keepKey = keepIds.filter((id) => id != null).join(",");

  const options = useMemo(() => {
    if (!enabled || loading) return [];

    const keep = new Set(keepKey ? keepKey.split(",").map(Number) : []);

    const result = (data?.items ?? [])
      .filter((employee) => employee.isActive || keep.has(employee.id))
      .map((employee) => ({
        value: employee.id,
        label: employee.isActive
          ? nameOf(employee)
          : `${nameOf(employee)} (غیرفعال)`,
      }));

    const known = new Set(result.map((option) => option.value));
    for (const id of keep) {
      if (!known.has(id)) {
        result.push({
          value: id,
          label: `کارمند #${id} (عضو این واحد نیست)`,
          outsider: true,
        });
      }
    }

    return result;
  }, [data, enabled, loading, keepKey]);

  return { options, isLoading: loading, isError };
}
