// src/features/employees/components/forms/EmployeeCredentialsForm.jsx
import { useState } from "react";
import { KeyRound, Eye, EyeOff } from "lucide-react";

import FormSectionCard from "@/shared/components/forms/FormSectionCard";
import FormField from "@/shared/components/forms/FormField";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import {
  passwordRules,
  requiredMessage,
  PASSWORD_RULE_MESSAGE,
} from "@/shared/utils/validationRules";

/**
 * رمز عبورِ اولیه — فقط هنگام *ثبت* کارمند.
 *
 * ادمین نمی‌تواند رمز یک کارمند دیگر را عوض کند: تنها API تغییر رمز
 * (`ChangePassword`) روی کاربرِ *جاریِ* توکن کار می‌کند و رمز قبلی را هم
 * می‌خواهد (سند، بخش ۳). پس این کارت در صفحه‌ی ویرایش اصلاً رندر نمی‌شود؛
 * جایگزینش برای کارمندی که رمزش را فراموش کرده، `ForgetPassword` است.
 */
export default function EmployeeCredentialsForm({ register, errors, watch }) {
  const [visible, setVisible] = useState(false);

  return (
    <FormSectionCard icon={KeyRound} title="رمز عبور اولیه">
      <div className="space-y-4">
        <FormField
          label="رمز عبور"
          htmlFor="password"
          required
          error={errors.password}
          hint={PASSWORD_RULE_MESSAGE}
        >
          <div className="relative">
            <Input
              id="password"
              dir="ltr"
              type={visible ? "text" : "password"}
              autoComplete="new-password"
              placeholder="••••••••"
              className="h-10 rounded-lg transition-all pl-10 font-mono"
              {...register("password", passwordRules())}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setVisible((prev) => !prev)}
              aria-label={visible ? "پنهان کردن رمز عبور" : "نمایش رمز عبور"}
              className="absolute left-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
            >
              {visible ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </div>
        </FormField>

        <FormField
          label="تکرار رمز عبور"
          htmlFor="rePassword"
          required
          error={errors.rePassword}
        >
          <Input
            id="rePassword"
            dir="ltr"
            type={visible ? "text" : "password"}
            autoComplete="new-password"
            placeholder="••••••••"
            className="h-10 rounded-lg transition-all font-mono"
            {...register("rePassword", {
              required: requiredMessage("تکرار رمز عبور"),
              validate: (value) =>
                value === watch("password") ||
                "رمز عبور و تکرار آن باید یکسان باشند.",
            })}
          />
        </FormField>
      </div>
    </FormSectionCard>
  );
}
