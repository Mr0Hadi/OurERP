import { Tag } from "lucide-react";

import FormField from "@/shared/components/forms/FormField";
import { Input } from "@/shared/components/ui/input";
import { persianNameRules } from "@/shared/lib/validationRules";
import PartyIdentityForm, { PartyPhoneField } from "@/features/partyAccount/components/PartyIdentityForm";

const INPUT_CLASS = "h-10 rounded-lg transition-all";

/**
 * قوانین فیلدها عیناً از `CreateCustomerCommandValidator` گرفته شده‌اند:
 * نام و نام خانوادگی فقط فارسی، و شماره تماس **اجباری و فقط موبایل**
 * (`^09\d{9}$`) — قبلاً اختیاری بود و اصلاً هم ذخیره نمی‌شد.
 */
export default function CustomerIdentityForm({ register, control, errors, imageUpload }) {
  return (
    <PartyIdentityForm
      register={register}
      control={control}
      imageUpload={imageUpload}
      imageLabel="عکس مشتری"
      descriptionPlaceholder="یادداشت یا توضیحات مربوط به مشتری..."
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="نام" htmlFor="firstName" required error={errors.firstName}>
          <Input
            id="firstName"
            placeholder="نام"
            className={INPUT_CLASS}
            {...register("firstName", persianNameRules("نام"))}
          />
        </FormField>

        <FormField label="نام خانوادگی" htmlFor="lastName" required error={errors.lastName}>
          <Input
            id="lastName"
            placeholder="نام خانوادگی"
            className={INPUT_CLASS}
            {...register("lastName", persianNameRules("نام خانوادگی"))}
          />
        </FormField>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <PartyPhoneField name="phoneNumber" control={control} error={errors.phoneNumber} />

        <FormField label="کد معرف" htmlFor="referralCode">
          <div className="relative">
            <Tag className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="referralCode"
              dir="ltr"
              placeholder="REF001"
              className={`${INPUT_CLASS} pr-10 input-rtl-placeholder`}
              {...register("referralCode")}
            />
          </div>
        </FormField>
      </div>
    </PartyIdentityForm>
  );
}
