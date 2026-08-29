// src/features/employees/components/forms/EmployeeAccessForm.jsx
import { Controller } from "react-hook-form";
import { ShieldCheck } from "lucide-react";

import FormSectionCard from "@/shared/components/forms/FormSectionCard";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Label } from "@/shared/components/ui/label";

/**
 * وضعیت حساب کاربری.
 *
 * انتخابگرِ «نقش» اینجا نیست و نباید باشد: کارمند در بکند هیچ نقشی ندارد
 * (`User.RoleId` و جدول `Roles` حذف شده‌اند) و «هد تیم / هد واحد» یک
 * فیلدِ کاربر نیست — یک اشاره از سمتِ واحد یا تیم به کاربر است
 * (`Department.HeadId`, `Team.HeadId`). تعیینش در صفحه‌ی همان واحد یا
 * تیم انجام می‌شود؛ گذاشتنِ یک Select اینجا یعنی UI چیزی را وعده بدهد
 * که هیچ endpoint ای ذخیره‌اش نمی‌کند.
 *
 * `isActive` فقط در حالت ویرایش نمایش داده می‌شود چون دستور `CreateUser`
 * آن را نمی‌گیرد — کارمند تازه‌ثبت‌شده همیشه فعال است.
 */
export default function EmployeeAccessForm({ control, isEditing }) {
  if (!isEditing) return null;

  return (
    <FormSectionCard icon={ShieldCheck} title="وضعیت حساب کاربری">
      <div className="rounded-xl border border-border bg-muted/20 p-4">
        <Controller
          name="isActive"
          control={control}
          render={({ field }) => (
            <div className="flex items-start gap-3">
              <Checkbox
                id="isActive"
                checked={Boolean(field.value)}
                onCheckedChange={(checked) => field.onChange(checked === true)}
                className="mt-0.5"
              />
              <div className="space-y-1">
                <Label
                  htmlFor="isActive"
                  className="text-sm font-medium cursor-pointer"
                >
                  حساب کاربری فعال است
                </Label>
                <p className="text-xs text-muted-foreground leading-5">
                  با غیرفعال‌کردن، کارمند دیگر نمی‌تواند وارد سیستم شود ولی
                  اسناد ثبت‌شده‌اش دست‌نخورده باقی می‌ماند.
                </p>
              </div>
            </div>
          )}
        />
      </div>
    </FormSectionCard>
  );
}
