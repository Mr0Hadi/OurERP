import { useState } from "react";
import { useForm } from "react-hook-form";
import { KeyRound, Eye, EyeOff } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/shared/components/ui/dialog";
import FormField from "@/shared/components/forms/FormField";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import {
  passwordRules,
  requiredMessage,
  PASSWORD_RULE_MESSAGE,
} from "@/shared/lib/validationRules";
import { useResetUserPasswordMutation } from "../../services/mutations";

/**
 * بازنشانیِ رمز عبورِ کارمندی که آن را فراموش کرده — فقط برای مسئولِ
 * دارای دسترسیِ ویرایشِ کاربر، روی حسابِ *شخصِ دیگر* (نه خودِ کاربرِ واردشده).
 *
 * جایگزینِ سناریوی «فراموشیِ رمز» است؛ برخلافِ فرمِ ثبتِ اولیه، رمزِ قبلی
 * لازم نیست چون مسئول دارد به‌جای کارمند این کار را انجام می‌دهد.
 */
export default function ResetPasswordDialog({
  open,
  onOpenChange,
  userId,
  displayName,
}) {
  const [visible, setVisible] = useState(false);
  const resetMutation = useResetUserPasswordMutation();

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm({ defaultValues: { password: "", rePassword: "" } });

  const close = () => {
    reset();
    setVisible(false);
    onOpenChange(false);
  };

  const onSubmit = (data) => {
    resetMutation.mutate(
      { userId, password: data.password, rePassword: data.rePassword },
      { onSuccess: close },
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => (next ? onOpenChange(true) : close())}
    >
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-4 w-4" />
              بازنشانی رمز عبور
            </DialogTitle>
            <DialogDescription>
              یک رمز عبور جدید برای {displayName} تعیین کنید. او باید با این
              رمز دوباره وارد شود.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <FormField
              label="رمز عبور جدید"
              htmlFor="reset-password"
              required
              error={errors.password}
              hint={PASSWORD_RULE_MESSAGE}
            >
              <div className="relative">
                <Input
                  id="reset-password"
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
              label="تکرار رمز عبور جدید"
              htmlFor="reset-rePassword"
              required
              error={errors.rePassword}
            >
              <Input
                id="reset-rePassword"
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

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={close}
              disabled={resetMutation.isPending}
            >
              انصراف
            </Button>
            <Button type="submit" disabled={resetMutation.isPending}>
              {resetMutation.isPending ? "در حال ثبت..." : "بازنشانی رمز عبور"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
