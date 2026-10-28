import FormField from "@/shared/components/forms/FormField";
import { Input } from "@/shared/components/ui/input";
import { optionalPersonNameRules, requiredMessage } from "@/shared/lib/validationRules";
import PartyIdentityForm, { PartyPhoneField } from "@/features/partyAccount/components/PartyIdentityForm";

const INPUT_CLASS = "h-10 rounded-lg transition-all";

/**
 * فیلدهای اجباری و قوانینشان عیناً از `CreateSupplierCommandValidator`
 * گرفته شده‌اند: نام و نام خانوادگی فقط فارسی، شماره تماس فقط موبایل
 * (`^09\d{9}$`)، و نام شرکت اجباری. بدون این‌ها کاربر کلِ فرم را پر
 * می‌کرد و تازه از سرور خطا می‌گرفت.
 */
export default function SupplierIdentityForm({ register, control, errors, imageUpload }) {
  return (
    <PartyIdentityForm
      register={register}
      control={control}
      imageUpload={imageUpload}
      imageLabel="تصویر تامین کننده"
      descriptionPlaceholder="یادداشت یا توضیحات مربوط به تامین‌کننده..."
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="نام مسئول" htmlFor="firstName" error={errors?.firstName}>
          <Input
            id="firstName"
            placeholder="نام"
            className={INPUT_CLASS}
            {...register("firstName", optionalPersonNameRules("نام", "lastName"))}
          />
        </FormField>

        <FormField label="نام خانوادگی مسئول" htmlFor="lastName" error={errors?.lastName}>
          <Input
            id="lastName"
            placeholder="نام خانوادگی"
            className={INPUT_CLASS}
            {...register("lastName", optionalPersonNameRules("نام خانوادگی", "firstName"))}
          />
        </FormField>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="نام شرکت" htmlFor="companyName" required error={errors?.companyName}>
          <Input
            id="companyName"
            placeholder="نام شرکت"
            className={INPUT_CLASS}
            {...register("companyName", { required: requiredMessage("نام شرکت") })}
          />
        </FormField>

        <PartyPhoneField name="phone" control={control} error={errors?.phone} />
      </div>
    </PartyIdentityForm>
  );
}
