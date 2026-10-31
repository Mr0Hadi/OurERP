import { Controller, useWatch } from "react-hook-form";
import { Input } from "@/shared/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Checkbox } from "@/shared/components/ui/checkbox";
import FormField from "@/shared/components/forms/FormField";
import FormPriceField from "@/shared/components/forms/FormPriceField";

/**
 * `required`: سرور کالای تازه‌ی کامل را با قیمتِ صفر رد می‌کند
 * (`CreateProductCommand`)؛ پیش‌تر کاربر این را فقط بعد از «ذخیره» و با پیامِ
 * سرور می‌فهمید.
 */
function PriceField({ name, label, control, error, required }) {
  return (
    <FormPriceField
      name={name}
      label={label}
      control={control}
      required={required}
      error={error}
      rules={{ validate: (raw) => !required || Number(raw) > 0 || "قیمت باید بیشتر از صفر باشد" }}
    />
  );
}

/**
 * موجودی، مالیات و قیمت‌ها.
 *
 * @param isNew          کالای تازه: «موجودی اولیه»؛ در ویرایش، تغییرِ موجودی یک
 *                       اصلاحِ دستی است و دانه‌ها را اضافه یا کم می‌کند
 *                       (`UpdateProduct` آن را با دانه‌ها تطبیق می‌دهد).
 * @param requirePrices  قیمت‌های بالای صفر الزامی‌اند (کالای تازه).
 */
export default function ProductPricingForm({
  register,
  control,
  errors = {},
  isNew = false,
  requirePrices = false,
}) {
  const taxExempt = useWatch({ control, name: "taxExempt" });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">موجودی و قیمت‌گذاری</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          label={isNew ? "موجودی اولیه" : "موجودی"}
          htmlFor="stock"
          error={errors.stock}
          hint={
            !isNew &&
            "تغییرِ این عدد اصلاحِ دستیِ موجودی ثبت می‌کند و دانه‌ها را به همان اندازه اضافه یا کم می‌کند."
          }
        >
          <Input
            type="number"
            id="stock"
            {...register("stock", {
              min: { value: 0, message: "موجودی نمی‌تواند منفی باشد" },
            })}
            min="0"
            placeholder="0"
          />
        </FormField>

        {/* سرور مالیاتِ هر قلمِ فاکتور را از همین دو فیلد حساب می‌کند؛ کالای
            معاف صفر مالیات می‌گیرد. فاکتورهای صادرشده نرخِ خودشان را نگه
            می‌دارند و با تغییرِ این‌جا عوض نمی‌شوند. */}
        <FormField label="مالیات بر ارزش افزوده (درصد %)" htmlFor="tax" error={errors.tax}>
          <Input
            type="number"
            id="tax"
            {...register("tax", {
              min: { value: 0, message: "درصد مالیات نمی‌تواند منفی باشد" },
              max: { value: 100, message: "درصد مالیات حداکثر ۱۰۰ است" },
            })}
            min="0"
            max="100"
            placeholder="0"
            disabled={Boolean(taxExempt)}
          />
          <Controller
            name="taxExempt"
            control={control}
            render={({ field }) => (
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <Checkbox
                  checked={Boolean(field.value)}
                  onCheckedChange={(checked) => field.onChange(checked === true)}
                />
                معاف از مالیات
              </label>
            )}
          />
        </FormField>

        <PriceField
          name="purchasePrice"
          label="قیمت خرید (ریال)"
          control={control}
          error={errors.purchasePrice}
          required={requirePrices}
        />
        <PriceField
          name="retailPrice"
          label="قیمت فروش خرده (ریال)"
          control={control}
          error={errors.retailPrice}
          required={requirePrices}
        />
        <PriceField
          name="wholeSalePrice"
          label="قیمت فروش همکار/عمده (ریال)"
          control={control}
          error={errors.wholeSalePrice}
          required={requirePrices}
        />
      </CardContent>
    </Card>
  );
}
