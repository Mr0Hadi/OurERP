import { Controller, useWatch } from "react-hook-form";

import { Input } from "@/shared/components/ui/input";
import FormField from "@/shared/components/forms/FormField";
import { Textarea } from "@/shared/components/ui/textarea";
import { Checkbox } from "@/shared/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";

import StatusBadge from "@/shared/components/status/StatusBadge";
import CategoryManager from "./CategoryManager";
import VehicleMultiSelect from "@/features/warehouse/vehicles/components/VehicleMultiSelect";
import { PRODUCT_UNIT_OPTIONS } from "@/shared/domain/enums/productUnit";
import OptionSelect from "@/shared/components/forms/OptionSelect";

/**
 * کد کالا و بارکد **ورودیِ کاربر نیستند**.
 *
 * بکند هر دو را خودش موقعِ ساختِ کالا تولید می‌کند و بعد از آن ثابت
 * نگه می‌دارد؛ `CreateProductCommand`/`UpdateProductCommand` اصلاً این
 * دو فیلد را ندارند، پس هرچه فرم بفرستد بی‌صدا دور ریخته می‌شود. به
 * همین دلیل اینجا فقط *نمایش* داده می‌شوند: در فرمِ کالای جدید هنوز
 * وجود ندارند و بعد از ذخیره پیدا می‌شوند.
 */
function ReadOnlyCodeField({ id, label, value, emptyHint }) {
  return (
    <FormField
      label={label}
      htmlFor={id}
      hint="این مقدار را سرور هنگام ثبت کالا می‌سازد و قابل ویرایش نیست."
      className="space-y-2"
    >
      <Input
        id={id}
        value={value || ""}
        readOnly
        disabled={!value}
        placeholder={emptyHint}
        className="font-mono text-start"
      />
    </FormField>
  );
}

export default function ProductBasicInfoForm({
  register,
  control,
  errors,
  showGeneratedCodes = true,
  // کالای ساخته‌شده با «ساخت سریع» در انبار: تا کامل شدن، برند و قیمت
  // الزامی نیستند (سرور هم همین را می‌پذیرد).
  isIncomplete = false,
}) {
  const code = useWatch({ control, name: "code" });
  const barCode = useWatch({ control, name: "barCode" });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-lg">اطلاعات پایه</CardTitle>
        {isIncomplete && (
          <StatusBadge tone="warning">ناقص — برند و قیمت‌ها را کامل کنید</StatusBadge>
        )}
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          label="نام کالا"
          htmlFor="name"
          required
          error={errors.name}
          className="space-y-2 md:col-span-2"
        >
          <Input
            id="name"
            placeholder="مثال: لنت ترمز جلو پراید"
            {...register("name", {
              required: "وارد کردن نام کالا الزامی است",
            })}
            className={errors.name ? "border-destructive/50" : ""}
          />
        </FormField>

        <FormField
          label="نام انگلیسی"
          htmlFor="englishName"
          error={errors.englishName}
          className="space-y-2 md:col-span-2"
        >
          <Input
            id="englishName"
            dir="ltr"
            placeholder="e.g. Front Brake Pad"
            {...register("englishName")}
            className={errors.englishName ? "border-destructive/50" : ""}
          />
        </FormField>

        {showGeneratedCodes && (
          <>
            <ReadOnlyCodeField
              id="code"
              label="کد کالا"
              value={code}
              emptyHint="پس از ثبت کالا ساخته می‌شود"
            />

            <ReadOnlyCodeField
              id="barCode"
              label="بارکد"
              value={barCode}
              emptyHint="پس از ثبت کالا ساخته می‌شود"
            />
          </>
        )}

        <FormField
          label="دسته‌بندی"
          htmlFor="productCategoryId"
          required
          error={errors.productCategoryId}
          className="space-y-2"
        >
          <Controller
            name="productCategoryId"
            control={control}
            rules={{ required: "انتخاب دسته‌بندی الزامی است" }}
            render={({ field }) => (
              <CategoryManager value={field.value} onChange={field.onChange} />
            )}
          />
        </FormField>

        <FormField
          label="برند"
          htmlFor="brand"
          required={!isIncomplete}
          error={errors.brand}
          className="space-y-2"
        >
          <Input
            id="brand"
            placeholder="مثال: ایساکو"
            {...register("brand", {
              required: isIncomplete ? false : "وارد کردن برند الزامی است",
            })}
            className={errors.brand ? "border-destructive/50" : ""}
          />
        </FormField>

        <FormField
          label="واحد شمارش"
          htmlFor="unit"
          required
          error={errors.unit}
          className="space-y-2 md:col-span-2"
        >
          <Controller
            name="unit"
            control={control}
            rules={{ required: "انتخاب واحد شمارش الزامی است" }}
            render={({ field }) => (
              <OptionSelect
                id="unit"
                dir="rtl"
                value={field.value}
                onChange={field.onChange}
                options={PRODUCT_UNIT_OPTIONS}
                numeric
                placeholder="انتخاب واحد"
                className="w-fit"
              />
            )}
          />
        </FormField>

        <FormField label="خودروها" className="space-y-2 md:col-span-2">
          <Controller
            name="vehicleIds"
            control={control}
            render={({ field }) => (
              <VehicleMultiSelect value={field.value ?? []} onChange={field.onChange} />
            )}
          />
        </FormField>

        <div className="md:col-span-2">
          <Controller
            name="requiresUnitTracking"
            control={control}
            render={({ field }) => (
              <label className="flex items-start gap-2 cursor-pointer">
                <Checkbox
                  checked={Boolean(field.value)}
                  onCheckedChange={(checked) => field.onChange(checked === true)}
                  className="mt-0.5"
                />
                <span className="text-sm">
                  ردیابی دانه‌ای
                  <span className="block text-xs text-muted-foreground">
                    در هر خروجِ کالا (ارسال، عودت، جایگزین) اسکنِ تک‌تکِ دانه‌ها
                    الزامی می‌شود. برای کالای فله روشن نکنید.
                  </span>
                </span>
              </label>
            )}
          />
        </div>

        <FormField label="توضیحات" htmlFor="description" className="space-y-2 md:col-span-2">
          <Textarea
            id="description"
            placeholder="یادداشت یا توضیحات مربوط به کالا..."
            className="min-h-[90px] resize-y"
            {...register("description")}
          />
        </FormField>
      </CardContent>
    </Card>
  );
}
