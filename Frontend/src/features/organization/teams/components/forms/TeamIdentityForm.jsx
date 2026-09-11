import { useMemo } from "react";
import { Users } from "lucide-react";

import FormSectionCard from "@/shared/components/forms/FormSectionCard";
import FormField from "@/shared/components/forms/FormField";
import FormSelectField from "@/shared/components/forms/FormSelectField";
import { Input } from "@/shared/components/ui/input";
import { useDepartmentOptionsQuery } from "../../../departments/services/queries";
import { teamNameRules, teamDepartmentRules } from "../../hooks/useTeamForm";

/**
 * هر تیم زیرمجموعه‌ی دقیقاً یک واحد است و `Team.DepartmentId` در بکند
 * غیرقابل‌null است — پس واحد اجباری است، نه اختیاری.
 *
 * `departmentReadOnly` (صفحه‌ی ویرایش): واحدِ تیم از فرمِ ویرایش عوض
 * نمی‌شود. انتقالِ تیم اثرِ جانبی دارد — اعضا و مدیر و معاونش هم باید
 * جابه‌جا شوند — و جایش عملیاتِ صریحِ «افزودن تیم موجود» در صفحه‌ی واحدِ
 * مقصد است، نه یک Select که کنار «نام تیم» بی‌صدا ذخیره شود. این کار
 * انتخابگرِ مدیر/معاون را هم ساده نگه می‌دارد: همیشه از کارمندانِ واحدِ
 * فعلیِ تیم.
 */
export default function TeamIdentityForm({
  register,
  errors,
  control,
  departmentReadOnly = false,
  departmentName,
}) {
  const { departments, isLoading, isFallback } = useDepartmentOptionsQuery();

  const departmentOptions = useMemo(
    () => departments.map((d) => ({ value: d.id, label: d.name })),
    [departments],
  );

  return (
    <FormSectionCard icon={Users} title="مشخصات تیم">
      <div className="space-y-4">
        <FormField label="نام تیم" htmlFor="name" required error={errors.name}>
          <Input
            id="name"
            placeholder="تیم ۲ فروش"
            className="h-10 rounded-lg transition-all"
            {...register("name", teamNameRules)}
          />
        </FormField>

        {departmentReadOnly ? (
          <FormField
            label="واحد سازمانی"
            htmlFor="departmentName"
            hint="برای انتقال تیم، از صفحه‌ی جزئیات واحدِ مقصد گزینه‌ی «افزودن تیم موجود» را بزنید."
          >
            <Input
              id="departmentName"
              readOnly
              value={departmentName ?? "—"}
              className="h-10 rounded-lg bg-muted/50 text-muted-foreground"
            />
          </FormField>
        ) : (
          <FormSelectField
            name="departmentId"
            control={control}
            label="واحد سازمانی"
            required
            options={departmentOptions}
            isLoading={isLoading}
            placeholder="انتخاب واحد"
            error={errors.departmentId}
            rules={teamDepartmentRules}
            hint={
              isFallback
                ? "فهرست واحدها هنوز از سرور نیامده؛ مقادیر پیش‌فرض نمایش داده می‌شود."
                : undefined
            }
          />
        )}
      </div>
    </FormSectionCard>
  );
}
