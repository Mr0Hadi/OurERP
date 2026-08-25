// src/features/employees/components/forms/EmployeeIdentityForm.jsx
import { UserCog } from "lucide-react";

import FormSectionCard from "@/shared/components/forms/FormSectionCard";
import FormField from "@/shared/components/forms/FormField";
import { Input } from "@/shared/components/ui/input";
import {
  persianNameRules,
  usernameRules,
  requiredMessage,
} from "@/shared/utils/validationRules";

/**
 * هویت و حسابِ کاربریِ کارمند.
 *
 * `personelCode` در حالت ویرایش فقط-خواندنی است: دستور `UpdateUser` این
 * فیلد را نمی‌پذیرد (سند، بخش ۳)، پس فرمی که اجازه‌ی تایپش را بدهد به
 * کاربر دروغ می‌گوید — تغییر را می‌پذیرد و بی‌صدا دور می‌ریزد.
 */
export default function EmployeeIdentityForm({ register, errors, isEditing }) {
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

          <FormField
            label="کد پرسنلی"
            htmlFor="personelCode"
            required={!isEditing}
            error={errors.personelCode}
            hint={isEditing ? "کد پرسنلی پس از ثبت قابل تغییر نیست" : undefined}
          >
            <Input
              id="personelCode"
              dir="ltr"
              placeholder="1001"
              readOnly={isEditing}
              className={`h-10 rounded-lg transition-all font-mono ${
                isEditing ? "bg-muted/50 text-muted-foreground" : ""
              }`}
              {...register(
                "personelCode",
                isEditing ? {} : { required: requiredMessage("کد پرسنلی") },
              )}
            />
          </FormField>
        </div>
      </div>
    </FormSectionCard>
  );
}
