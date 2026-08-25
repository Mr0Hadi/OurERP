// src/features/employees/components/forms/EmployeeAccessForm.jsx
import { Controller } from "react-hook-form";
import { ShieldCheck } from "lucide-react";

import FormSectionCard from "@/shared/components/forms/FormSectionCard";
import FormField from "@/shared/components/forms/FormField";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Label } from "@/shared/components/ui/label";
import {
  UserRoleEnum,
  USER_ROLE_OPTIONS,
} from "@/shared/domain/enums/userRole";

/**
 * نقش و وضعیت دسترسی.
 *
 * `isActive` فقط در حالت ویرایش نمایش داده می‌شود چون دستور `CreateUser`
 * آن را نمی‌گیرد — کارمند تازه‌ثبت‌شده همیشه فعال است.
 */
export default function EmployeeAccessForm({ control, isEditing }) {
  return (
    <FormSectionCard icon={ShieldCheck} title="نقش و دسترسی">
      <div className="space-y-5">
        <FormField
          label="نقش کارمند"
          htmlFor="roleId"
          required
          hint="نقش «مدیر سیستم» به تمام بخش‌های برنامه دسترسی دارد."
        >
          <Controller
            name="roleId"
            control={control}
            render={({ field }) => (
              <Select
                value={String(field.value ?? UserRoleEnum.USER)}
                onValueChange={(value) => field.onChange(Number(value))}
              >
                <SelectTrigger
                  id="roleId"
                  className="h-10 rounded-lg transition-all"
                >
                  <SelectValue placeholder="انتخاب کنید" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {USER_ROLE_OPTIONS.map((option) => (
                    <SelectItem
                      key={option.value}
                      value={String(option.value)}
                      className="rounded-lg"
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </FormField>

        {isEditing && (
          <div className="rounded-xl border border-border bg-muted/20 p-4">
            <Controller
              name="isActive"
              control={control}
              render={({ field }) => (
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="isActive"
                    checked={Boolean(field.value)}
                    onCheckedChange={(checked) =>
                      field.onChange(checked === true)
                    }
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
        )}
      </div>
    </FormSectionCard>
  );
}
