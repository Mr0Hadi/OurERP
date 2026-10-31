import { useForm, useWatch } from "react-hook-form";
import { Loader2 } from "lucide-react";

import FormField from "@/shared/components/forms/FormField";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { persianNameRules } from "@/shared/lib/validationRules";
import { useUpdateUserInfoMutation } from "../services/mutations";

/**
 * نام و نام خانوادگیِ کاربرِ جاری (`User/UpdateUserInfo`). بقیه‌ی مشخصات (واحد، تیم،
 * کد پرسنلی) کارِ مسئول است و اینجا فقط‌خواندنی‌اند.
 *
 * «تغییر کرده؟» با مقایسه‌ی مستقیم با دادهِ سرور است، نه `isDirty`: بعد از ذخیره و
 * تازه‌شدنِ `user`، `isDirty`ِ react-hook-form دیگر عوض نمی‌شد و دکمه قفل می‌ماند.
 * فرم با `key` (نامِ سرور) در `AccountPage` دوباره ساخته می‌شود.
 */
export default function ProfileForm({ user }) {
  const updateMutation = useUpdateUserInfoMutation();
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm({
    defaultValues: { firstName: user.firstName ?? "", lastName: user.lastName ?? "" },
    mode: "onTouched",
  });
  const [firstName, lastName] = useWatch({ control, name: ["firstName", "lastName"] });
  const changed =
    firstName.trim() !== (user.firstName ?? "") || lastName.trim() !== (user.lastName ?? "");

  const onSubmit = (values) =>
    updateMutation.mutate({ firstName: values.firstName.trim(), lastName: values.lastName.trim() });

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="نام" htmlFor="firstName" required error={errors.firstName}>
          <Input
            id="firstName"
            autoComplete="given-name"
            className="h-11 rounded-lg sm:h-10"
            aria-invalid={!!errors.firstName}
            {...register("firstName", persianNameRules("نام"))}
          />
        </FormField>
        <FormField label="نام خانوادگی" htmlFor="lastName" required error={errors.lastName}>
          <Input
            id="lastName"
            autoComplete="family-name"
            className="h-11 rounded-lg sm:h-10"
            aria-invalid={!!errors.lastName}
            {...register("lastName", persianNameRules("نام خانوادگی"))}
          />
        </FormField>
      </div>

      <Button
        type="submit"
        disabled={!changed || updateMutation.isPending}
        className="h-11 w-full sm:h-10 sm:w-auto"
      >
        {updateMutation.isPending && <Loader2 className="size-4 animate-spin" />}
        {updateMutation.isPending ? "در حال ذخیره..." : "ذخیره‌ی تغییرات"}
      </Button>
    </form>
  );
}
