import { Controller } from "react-hook-form";

import FormField from "./FormField";
import OptionSelect from "./OptionSelect";

/**
 * انتخابگرِ متصل به react-hook-form — برچسب، Select و پیام خطا در یک جا.
 *
 * ترکیب `FormField` + `Controller` + `Select` در فرم‌های کارمند، واحد و
 * تیم بارها لازم می‌شود و هر بار همان ده خط بویلرپلیت است. تنها نکته‌ی
 * غیرِ بدیهی‌اش نگاشتِ نوع است:
 *
 * نگاشتِ رشته ↔ عدد را `OptionSelect` می‌کند؛ اینجا `numeric` پیش‌فرض است چون
 * enumهای این پروژه عددی‌اند.
 *
 * `emptyValue` برای فیلدهای اختیاری است (مثل «مدیر واحد» که می‌تواند
 * خالی بماند): یک گزینه‌ی صریحِ «بدون مدیر» اضافه می‌کند که به `null`
 * ترجمه می‌شود، نه به رشته‌ی خالی.
 */
export default function FormSelectField({
  name,
  control,
  label,
  options = [],
  required = false,
  disabled = false,
  isLoading = false,
  numeric = true,
  placeholder = "انتخاب کنید",
  hint,
  error,
  emptyValue = null,
  emptyLabel,
  rules,
}) {
  return (
    <FormField
      label={label}
      htmlFor={name}
      required={required}
      error={error}
      hint={hint}
    >
      <Controller
        name={name}
        control={control}
        rules={rules}
        render={({ field }) => (
          <OptionSelect
            id={name}
            value={field.value}
            onChange={field.onChange}
            options={options}
            numeric={numeric}
            placeholder={placeholder}
            isLoading={isLoading}
            disabled={disabled}
            emptyLabel={
              emptyLabel == null ? undefined : (
                <span className="text-muted-foreground">{emptyLabel}</span>
              )
            }
            emptyValue={emptyValue}
            className="h-10 w-full rounded-lg transition-all"
            contentClassName="rounded-xl"
            itemClassName="rounded-lg"
          />
        )}
      />
    </FormField>
  );
}
