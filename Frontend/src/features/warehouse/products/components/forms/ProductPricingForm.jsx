import { Controller, useWatch } from "react-hook-form";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { PriceInput } from "@/shared/components/ui/price-input";
import { Checkbox } from "@/shared/components/ui/checkbox";
import AmountInWords from "@/shared/components/forms/AmountInWords";

/**
 * یک قیمت با `PriceInput` و مبلغ به حروف.
 *
 * `required`: سرور کالای تازه‌ی کامل را با قیمتِ صفر رد می‌کند
 * (`CreateProductCommand`)؛ پیش‌تر کاربر این را فقط بعد از «ذخیره» و با پیامِ
 * سرور می‌فهمید.
 */
function PriceField({ name, label, control, errors, required }) {
  const value = useWatch({ control, name });
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      <Controller
        name={name}
        control={control}
        rules={{
          validate: (raw) => !required || Number(raw) > 0 || "قیمت باید بیشتر از صفر باشد",
        }}
        render={({ field }) => (
          <PriceInput
            id={name}
            min={0}
            value={field.value === "" || field.value == null ? null : Number(field.value)}
            onValueChange={(next) => field.onChange(next ?? "")}
          />
        )}
      />
      {errors[name] && <span className="text-xs text-destructive">{errors[name].message}</span>}
      <AmountInWords rial={value} />
    </div>
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
        <div className="space-y-2">
          <Label htmlFor="stock">{isNew ? "موجودی اولیه" : "موجودی"}</Label>
          <Input
            type="number"
            id="stock"
            {...register("stock", {
              min: { value: 0, message: "موجودی نمی‌تواند منفی باشد" },
            })}
            min="0"
            placeholder="0"
          />
          {errors.stock && <span className="text-xs text-destructive">{errors.stock.message}</span>}
          {!isNew && (
            <span className="block text-[11px] text-muted-foreground">
              تغییرِ این عدد اصلاحِ دستیِ موجودی ثبت می‌کند و دانه‌ها را به همان اندازه اضافه یا کم
              می‌کند.
            </span>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="lowStockThreshold">آستانه هشدار کمبود موجودی</Label>
          <Input
            type="number"
            id="lowStockThreshold"
            {...register("lowStockThreshold")}
            min="0"
            placeholder="مثال: 10"
          />
        </div>

        {/* سرور مالیاتِ هر قلمِ فاکتور را از همین دو فیلد حساب می‌کند؛ کالای
            معاف صفر مالیات می‌گیرد. فاکتورهای صادرشده نرخِ خودشان را نگه
            می‌دارند و با تغییرِ این‌جا عوض نمی‌شوند. */}
        <div className="space-y-2">
          <Label htmlFor="tax">مالیات بر ارزش افزوده (درصد %)</Label>
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
          {errors.tax && <span className="text-xs text-destructive">{errors.tax.message}</span>}
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
        </div>

        <PriceField
          name="purchasePrice"
          label="قیمت خرید (ریال)"
          control={control}
          errors={errors}
          required={requirePrices}
        />
        <PriceField
          name="retailPrice"
          label="قیمت فروش خرده (ریال)"
          control={control}
          errors={errors}
          required={requirePrices}
        />
        <PriceField
          name="wholeSalePrice"
          label="قیمت فروش همکار/عمده (ریال)"
          control={control}
          errors={errors}
          required={requirePrices}
        />
      </CardContent>
    </Card>
  );
}
