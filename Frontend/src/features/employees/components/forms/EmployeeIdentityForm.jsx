// src/features/employees/components/forms/EmployeeIdentityForm.jsx
import { UserCog } from "lucide-react";

import FormSectionCard from "@/shared/components/forms/FormSectionCard";
import FormField from "@/shared/components/forms/FormField";
import { Input } from "@/shared/components/ui/input";
import { persianNameRules, usernameRules } from "@/shared/utils/validationRules";

/**
 * هویت و حسابِ کاربریِ کارمند.
 *
 * `personelCode` هیچ‌وقت ورودیِ کاربر نیست — نه در ثبت و نه در ویرایش.
 * سرور خودش کد پرسنلی می‌سازد (سند `docs/org-structure-contract.fa.md`)
 * چون این کد باید یکتا و پیوسته باشد؛ اگر کاربر تایپش می‌کرد، تصادم و
 * شماره‌های ناموزون («۱۰۰۱» بعد از «۹۹۹۹») غیرقابل‌اجتناب بود. در حالت
 * ویرایش فقط *نمایش* داده می‌شود، چون در آن لحظه سرور از قبل تعیینش
 * کرده.
 */
export default function EmployeeIdentityForm({ register, errors, isEditing, personelCode }) {
  return (
    <FormSectionCard icon={UserCog} title="اطلاعات هویتی و حساب کاربری">
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            label="نام"
            htmlFor="firstName"
            required
            error={errors.firstName}
          >
            <Input
              id="firstName"
              placeholder="نام"
              className="h-10 rounded-lg transition-all"
              {...register("firstName", persianNameRules("نام"))}
            />
          </FormField>

          <FormField
            label="نام خانوادگی"
            htmlFor="lastName"
            required
            error={errors.lastName}
          >
            <Input
              id="lastName"
              placeholder="نام خانوادگی"
              className="h-10 rounded-lg transition-all"
              {...register("lastName", persianNameRules("نام خانوادگی"))}
            />
          </FormField>
        </div>

        <div className={isEditing ? "grid grid-cols-1 sm:grid-cols-2 gap-4" : ""}>
          <FormField
            label="نام کاربری"
            htmlFor="username"
            required
            error={errors.username}
            hint="فقط حروف انگلیسی، عدد، خط تیره و زیرخط"
          >
            <Input
              id="username"
              dir="ltr"
              placeholder="ali_rezaei"
              className="h-10 rounded-lg transition-all font-mono"
              {...register("username", usernameRules())}
            />
          </FormField>

          {isEditing && (
            <FormField
              label="کد پرسنلی"
              htmlFor="personelCode"
              hint="این کد را سیستم هنگام ثبت کارمند می‌سازد و قابل تغییر نیست."
            >
              <Input
                id="personelCode"
                dir="ltr"
                readOnly
                value={personelCode || ""}
                className="h-10 rounded-lg transition-all font-mono bg-muted/50 text-muted-foreground"
              />
            </FormField>
          )}
        </div>
      </div>
    </FormSectionCard>
  );
}
