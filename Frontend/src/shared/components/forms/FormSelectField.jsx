import { Controller } from "react-hook-form";

import FormField from "./FormField";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

/**
 * انتخابگرِ متصل به react-hook-form — برچسب، Select و پیام خطا در یک جا.
 *
 * ترکیب `FormField` + `Controller` + `Select` در فرم‌های کارمند، واحد و
 * تیم بارها لازم می‌شود و هر بار همان ده خط بویلرپلیت است. تنها نکته‌ی
 * غیرِ بدیهی‌اش نگاشتِ نوع است:
 *
 * Select همیشه *رشته* می‌دهد و می‌گیرد، ولی enum های این پروژه عددی‌اند.
 * پس مقدار در ورودی به رشته و در خروجی به عدد برمی‌گردد (`numeric`، که
 * پیش‌فرض است). بدون این، مقایسه‌ی بعدی با مقدار عددیِ واقعی هیچ‌وقت
 * درست درنمی‌آید — همان دامی که `normalizeFilterValue` در فیلترها می‌گیرد.
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
  // مقدارِ ویژه‌ی «هیچ‌کدام». رشته‌ی خالی به Select داده نمی‌شود چون
  // Radix آن را «بدون انتخاب» می‌فهمد و placeholder را نگه می‌دارد.
  const NONE = "__none__";
  const showEmptyOption = emptyLabel != null;

  const toFieldValue = (raw) => {
    if (raw === NONE) return emptyValue;
    return numeric ? Number(raw) : raw;
  };

  const toSelectValue = (value) => {
    if (value === null || value === undefined || value === "") {
      return showEmptyOption ? NONE : undefined;
    }
    return String(value);
  };

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
          <Select
            value={toSelectValue(field.value)}
            onValueChange={(raw) => field.onChange(toFieldValue(raw))}
            disabled={disabled || isLoading}
          >
            <SelectTrigger id={name} className="h-10 rounded-lg transition-all">
              <SelectValue
                placeholder={isLoading ? "در حال بارگذاری..." : placeholder}
              />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {showEmptyOption && (
                <SelectItem value={NONE} className="rounded-lg">
                  <span className="text-muted-foreground">{emptyLabel}</span>
                </SelectItem>
              )}
              {options.map((option) => (
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
  );
}
