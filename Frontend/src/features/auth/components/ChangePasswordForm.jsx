import { useForm, useWatch } from "react-hook-form";
import { Check, Circle, Loader2 } from "lucide-react";

import FormField from "@/shared/components/forms/FormField";
import PasswordInput from "@/shared/components/forms/PasswordInput";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";
import { passwordChecks, passwordRules, requiredMessage } from "@/shared/lib/validationRules";
import { useChangePasswordMutation } from "../services/mutations";

/** فهرستِ زنده‌ی شرط‌های رمز؛ تا چیزی تایپ نشده خاکستری. */
function PasswordChecklist({ value }) {
  const typed = !!value;
  return (
    <ul className="grid grid-cols-1 gap-1.5 text-xs min-[400px]:grid-cols-2" aria-live="polite">
      {passwordChecks(value).map(({ key, label, ok }) => (
        <li
          key={key}
          className={cn(
            "flex items-center gap-1.5",
            !typed ? "text-muted-foreground" : ok ? "text-success" : "text-destructive",
          )}
        >
          {typed && ok ? <Check className="size-3.5 shrink-0" /> : <Circle className="size-2.5 shrink-0" />}
          {label}
        </li>
      ))}
    </ul>
  );
}

/**
 * فرمِ تغییرِ رمزِ کاربرِ جاری (`User/ChangePassword`) — هم در صفحه‌ی حساب، هم در
 * تغییرِ رمزِ اجباری بعد از بازنشانی توسطِ مدیر.
 *
 * @param {object} props
 * @param {string} [props.username] برای مدیرِ رمزِ مرورگر (کدام حساب)
 * @param {string} [props.oldPasswordLabel] در حالتِ اجباری «رمز عبور موقت»
 * @param {string} [props.submitLabel]
 * @param {() => void} [props.onSuccess] بعد از جایگزینیِ توکن‌ها
 * @param {boolean} [props.block] دکمه‌ی ثبت در همه‌ی عرض‌ها تمام‌عرض (کارتِ باریک)
 */
export default function ChangePasswordForm({
  username,
  oldPasswordLabel = "رمز عبور فعلی",
  submitLabel = "تغییر رمز عبور",
  onSuccess,
  block = false,
}) {
  const changeMutation = useChangePasswordMutation();
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: { oldPassword: "", password: "", rePassword: "" },
    mode: "onTouched",
  });
  const password = useWatch({ control, name: "password" });

  const onSubmit = (values) =>
    changeMutation.mutate(values, {
      onSuccess: () => {
        reset();
        onSuccess?.();
      },
    });

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {username && (
        <input type="text" name="username" autoComplete="username" value={username} hidden readOnly />
      )}

      <FormField label={oldPasswordLabel} htmlFor="oldPassword" required error={errors.oldPassword}>
        <PasswordInput
          id="oldPassword"
          autoComplete="current-password"
          aria-invalid={!!errors.oldPassword}
          {...register("oldPassword", { required: requiredMessage(oldPasswordLabel) })}
        />
      </FormField>

      {/* خطای «شرط‌ها» تکرارِ فهرستِ زیرِ فیلد است؛ فقط «خالی» و «برابر با رمزِ فعلی» متن می‌گیرند. */}
      <FormField
        label="رمز عبور جدید"
        htmlFor="password"
        required
        error={errors.password?.type === "rule" ? undefined : errors.password}
      >
        <PasswordInput
          id="password"
          autoComplete="new-password"
          aria-invalid={!!errors.password}
          {...register("password", {
            ...passwordRules("رمز عبور جدید"),
            validate: {
              rule: passwordRules().validate,
              differs: (value, form) =>
                value !== form.oldPassword || "رمز عبور جدید باید با رمز عبور فعلی متفاوت باشد.",
            },
          })}
        />
      </FormField>
      <PasswordChecklist value={password} />

      <FormField label="تکرار رمز عبور جدید" htmlFor="rePassword" required error={errors.rePassword}>
        <PasswordInput
          id="rePassword"
          autoComplete="new-password"
          aria-invalid={!!errors.rePassword}
          {...register("rePassword", {
            required: requiredMessage("تکرار رمز عبور جدید"),
            validate: (value, form) =>
              value === form.password || "رمز عبور جدید و تکرار آن باید یکسان باشند.",
          })}
        />
      </FormField>

      <Button
        type="submit"
        disabled={changeMutation.isPending}
        className={cn("h-11 w-full sm:h-10", !block && "sm:w-auto")}
      >
        {changeMutation.isPending && <Loader2 className="size-4 animate-spin" />}
        {changeMutation.isPending ? "در حال ذخیره..." : submitLabel}
      </Button>
    </form>
  );
}
