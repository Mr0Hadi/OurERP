import { Controller, useWatch } from "react-hook-form";

import FormField from "./FormField";
import { PriceInput } from "@/shared/components/ui/price-input";
import { rialAmountInWords } from "@/shared/lib/numberToPersianWords";
import { cn } from "@/shared/lib/utils";

/**
 * فیلدِ مبلغِ ریالیِ react-hook-form: برچسب، `PriceInput`، خطا و مبلغ به حروف.
 *
 * مقدارِ فرم رشته‌ی خالی یا عدد است (پیش‌فرض‌های فرم‌ها `""` اند)، ولی `PriceInput`
 * `null` یا عدد می‌خواهد؛ تبدیل در همین مرز است. مبلغ به حروف جای `hint` می‌نشیند
 * و با خطا جایش را به پیامِ خطا می‌دهد.
 *
 * @param {React.ComponentType} [icon] آیکنِ lucide داخلِ فیلد، سمتِ شروع
 * @param {boolean} [suffix] برچسبِ «ریال» داخلِ فیلد، سمتِ پایان
 */
export default function FormPriceField({
  name,
  control,
  label,
  required = false,
  rules,
  error,
  hint,
  icon: Icon,
  suffix = false,
  inputClassName,
  className,
}) {
  const value = useWatch({ control, name });

  return (
    <FormField
      label={label}
      htmlFor={name}
      required={required}
      error={error}
      hint={rialAmountInWords(value) || hint}
      className={cn("space-y-1.5", className)}
    >
      <Controller
        name={name}
        control={control}
        rules={rules}
        render={({ field }) => (
          <div className="relative">
            {Icon && (
              <Icon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            )}
            <PriceInput
              id={name}
              min={0}
              value={field.value === "" || field.value == null ? null : Number(field.value)}
              onValueChange={(next) => field.onChange(next ?? "")}
              className={cn(
                "h-10 rounded-lg transition-all",
                Icon && "pr-10",
                suffix && "pl-16",
                inputClassName,
              )}
            />
            {suffix && (
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-sm font-medium text-muted-foreground">
                ریال
              </div>
            )}
          </div>
        )}
      />
    </FormField>
  );
}
