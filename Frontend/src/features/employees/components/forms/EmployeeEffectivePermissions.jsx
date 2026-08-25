// src/features/employees/components/forms/EmployeeEffectivePermissions.jsx
import { useMemo } from "react";
import { ShieldCheck, Crown } from "lucide-react";

import FormSectionCard from "@/shared/components/forms/FormSectionCard";
import { Badge } from "@/shared/components/ui/badge";
import { useDepartmentQuery } from "@/features/organization/departments/services/queries";
import { PERMISSION_CATALOG } from "@/shared/domain/permissions/permissionCatalog";
import { effectivePermissionIds } from "@/shared/domain/permissions/effectivePermissions";
import { OrgPositionEnum } from "@/shared/domain/enums/orgPosition";

/**
 * پیش‌نمایشِ *فقط‌خواندنیِ* دسترسیِ محاسبه‌شده‌ی این کارمند.
 *
 * چیزی برای ویرایش اینجا نیست — دسترسی مستقیم روی خودِ کارمند تنظیم
 * نمی‌شود، محصولِ واحدِ او و جایگاهش در آن واحد است
 * (`shared/domain/permissions/effectivePermissions.js`). این کارت فقط
 * نتیجه‌ی آن محاسبه را نشان می‌دهد تا وقتی ادمین دسترسیِ یک واحد را در
 * صفحه‌ی آن واحد عوض می‌کند، بتواند همین‌جا هم اثرش را روی این کارمند
 * ببیند.
 */
export default function EmployeeEffectivePermissions({ employee }) {
  const { data: department, isLoading } = useDepartmentQuery(employee.departmentId);

  const isManager =
    department != null &&
    (department.headId === employee.id || department.deputyId === employee.id);

  const grantedIds = useMemo(() => {
    if (!department) return [];
    return effectivePermissionIds({
      memberPermissionIds: department.memberPermissionIds ?? [],
      managerPermissionIds: department.managerPermissionIds ?? [],
      position: isManager ? OrgPositionEnum.HEAD : OrgPositionEnum.MEMBER,
    });
  }, [department, isManager]);

  const grantedItems = useMemo(
    () => PERMISSION_CATALOG.filter((item) => grantedIds.includes(item.id)),
    [grantedIds],
  );

  if (!employee.departmentId) {
    return (
      <FormSectionCard icon={ShieldCheck} title="دسترسی‌های محاسبه‌شده">
        <p className="text-sm text-muted-foreground">
          تا واحد سازمانی این کارمند تعیین نشود، دسترسی‌ای محاسبه نمی‌شود.
        </p>
      </FormSectionCard>
    );
  }

  return (
    <FormSectionCard icon={ShieldCheck} title="دسترسی‌های محاسبه‌شده">
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground leading-5">
          این دسترسی‌ها مستقیم روی کارمند تنظیم نمی‌شوند؛ حاصلِ دسترسیِ واحدِ{" "}
          <span className="font-medium text-foreground">
            {department?.name ?? "—"}
          </span>{" "}
          است. برای تغییرشان به صفحه‌ی همان واحد بروید.
        </p>

        {isManager && (
          <div className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
            <Crown className="h-3 w-3" />
            به‌عنوان مدیر/معاونِ واحد، دسترسیِ اضافه هم دارد
          </div>
        )}

        {isLoading ? (
          <p className="text-sm text-muted-foreground">در حال محاسبه...</p>
        ) : grantedItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            این واحد هنوز هیچ دسترسی‌ای تعریف نکرده است.
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {grantedItems.map((item) => (
              <Badge key={item.id} variant="outline" className="font-normal">
                {item.label}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </FormSectionCard>
  );
}
