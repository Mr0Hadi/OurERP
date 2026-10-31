import { Controller } from "react-hook-form";
import { User } from "lucide-react";

import FormField from "@/shared/components/forms/FormField";
import FormSectionCard from "@/shared/components/forms/FormSectionCard";
import ImageUploadField from "@/shared/components/files/ImageUploadField";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { NationalIdInput } from "@/shared/components/ui/national-id-input";
import { MobileNumberInput } from "@/shared/components/ui/mobile-number-input";
import { mobileRules } from "@/shared/lib/validationRules";

const LTR_INPUT_CLASS = "h-10 rounded-lg transition-all input-rtl-placeholder";

/**
 * کارتِ «اطلاعات هویتی» مشتری و تامین‌کننده: عکس، فیلدهای خاصِ هر طرف (`children`)،
 * سه شناسه‌ی حقوقی و توضیحات. شناسه‌ها و توضیحات در هر دو کنترلر هم‌نام‌اند
 * (`economicCode`، `nationalId`، `registrationNumber`، `description`)؛ نام، تلفن و
 * فیلدهای دیگر فرق دارند و قانونشان از validatorِ همان کنترلر است، پس بیرون می‌مانند.
 *
 * @param imageLabel             برچسبِ آپلودِ عکس
 * @param descriptionPlaceholder متنِ راهنمای توضیحات
 */
export default function PartyIdentityForm({
  register,
  control,
  imageUpload,
  imageLabel,
  descriptionPlaceholder,
  children,
}) {
  return (
    <FormSectionCard icon={User} title="اطلاعات هویتی">
      <div className="flex flex-col sm:flex-row gap-6 items-start">
        {/* کلید در `imageUrl` payload می‌رود، نه خودِ فایل */}
        <div className="shrink-0 w-full sm:w-auto">
          <ImageUploadField
            upload={imageUpload}
            label={imageLabel}
            emptyIcon={User}
            className="w-full sm:w-auto"
          />
        </div>

        <div className="flex-1 w-full space-y-4">
          {children}

          {/* سه شناسه‌ی حقوقی — اختیاری، ولی سرور از روز اول ستونشان را داشت. */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormField label="کد اقتصادی" htmlFor="economicCode">
              <Input
                id="economicCode"
                dir="ltr"
                placeholder="14001234567"
                className={LTR_INPUT_CLASS}
                {...register("economicCode")}
              />
            </FormField>

            <FormField label="شناسه ملی" htmlFor="nationalId">
              <Controller
                name="nationalId"
                control={control}
                render={({ field }) => (
                  <NationalIdInput id="nationalId" value={field.value} onValueChange={field.onChange} />
                )}
              />
            </FormField>

            <FormField label="شماره ثبت" htmlFor="registrationNumber">
              <Input
                id="registrationNumber"
                dir="ltr"
                placeholder="123456"
                className={LTR_INPUT_CLASS}
                {...register("registrationNumber")}
              />
            </FormField>
          </div>

          <FormField label="توضیحات" htmlFor="description">
            <Textarea
              id="description"
              placeholder={descriptionPlaceholder}
              className="min-h-[70px] rounded-lg transition-all resize-none"
              {...register("description")}
            />
          </FormField>
        </div>
      </div>
    </FormSectionCard>
  );
}

/**
 * «شماره تماس»ِ اجباریِ طرف‌حساب — فقط موبایل (`^09\d{9}$`)، همان قانونِ هر دو validator.
 * نامِ فیلد فرق دارد: مشتری `phoneNumber`، تامین‌کننده `phone`.
 */
export function PartyPhoneField({ name, control, error }) {
  return (
    <FormField label="شماره تماس" htmlFor={name} required error={error}>
      <Controller
        name={name}
        control={control}
        rules={mobileRules()}
        render={({ field }) => (
          <MobileNumberInput id={name} value={field.value} onValueChange={field.onChange} />
        )}
      />
    </FormField>
  );
}
