import { useState } from "react";
import { Controller } from "react-hook-form";
import { ChevronDown } from "lucide-react";

import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import FormField from "@/shared/components/forms/FormField";
import FilterCollapse from "@/shared/components/filters/FilterCollapse";
import PartySelect from "@/features/partyAccount/components/PartySelect";

const isBlank = (value) => value === "" || value == null;

/**
 * عددِ اختیاری روی `FormField`؛ خالی یعنی «تعیین نشده» (`null` در سرور). خطای همان فیلد
 * (`errors.x`) را می‌گیرد نه کلِ `errors`: RHF آن شیء را درجا عوض می‌کند و Compiler
 * فرزندی را که فقط همان مرجع را گرفته دوباره رندر نمی‌کند.
 */
function NumberField({ id, label, register, rules, error, placeholder }) {
  return (
    <FormField label={label} htmlFor={id} error={error}>
      <Input type="number" inputMode="numeric" id={id} min="0" placeholder={placeholder} {...register(id, rules)} />
    </FormField>
  );
}

/**
 * نقطه‌ی سفارش — ورودیِ صفحه‌ی «پیشنهاد خرید» (`Reorder`، بخش ۲۷ سند). سه فیلدِ اصلی پیدا؛
 * حداقل سفارش و زمان تحویل زیرِ «بیشتر»، چون بیشترِ کالاها لازمشان ندارند. همه همیشه
 * فرستاده می‌شوند (`buildProductPayload`)، پنهان یا پیدا.
 */
export default function ProductReorderForm({ register, control, errors = {} }) {
  const [more, setMore] = useState(
    Boolean(errors.minOrderQuantity || errors.leadTimeDays),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">نقطه‌ی سفارش</CardTitle>
        <CardDescription>
          وقتی موجودی به این عدد برسد، کالا در «پیشنهاد خرید» می‌آید. صفر یعنی
          هیچ‌وقت.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <NumberField
            id="lowStockThreshold"
            label="نقطه‌ی سفارش"
            placeholder="مثال: 10"
            register={register}
            error={errors.lowStockThreshold}
            rules={{ min: { value: 0, message: "نمی‌تواند منفی باشد" } }}
          />
          <NumberField
            id="targetStock"
            label="خرید تا موجودیِ"
            placeholder="همان نقطه‌ی سفارش"
            register={register}
            error={errors.targetStock}
            rules={{
              validate: (value, form) =>
                isBlank(value) ||
                Number(value) >= (Number(form.lowStockThreshold) || 0) ||
                "نباید از نقطه‌ی سفارش کمتر باشد",
            }}
          />
          <FormField label="تامین‌کننده‌ی ترجیحی" className="space-y-1.5 sm:col-span-2">
            <Controller
              name="preferredSupplierId"
              control={control}
              render={({ field }) => (
                <PartySelect
                  side="supplier"
                  label={null}
                  placeholder="خالی: همان تامین‌کننده‌ی آخرین خرید"
                  value={field.value}
                  onSelect={field.onChange}
                />
              )}
            />
          </FormField>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="-mx-2 gap-1 text-muted-foreground"
          onClick={() => setMore((value) => !value)}
          aria-expanded={more}
        >
          <ChevronDown
            className={`size-4 transition-transform ${more ? "rotate-180" : ""}`}
          />
          بیشتر
        </Button>
        <FilterCollapse
          open={more}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        >
          <NumberField
            id="minOrderQuantity"
            label="حداقل مقدار سفارش"
            placeholder="مثلاً کارتنِ ۶تایی: 6"
            register={register}
            error={errors.minOrderQuantity}
            rules={{
              validate: (value) =>
                isBlank(value) || Number(value) > 0 || "باید بیشتر از صفر باشد",
            }}
          />
          <NumberField
            id="leadTimeDays"
            label="زمان تحویل (روز)"
            placeholder="اختیاری"
            register={register}
            error={errors.leadTimeDays}
            rules={{
              validate: (value) =>
                isBlank(value) ||
                (Number(value) >= 0 && Number(value) <= 365) ||
                "بین ۰ و ۳۶۵ روز",
            }}
          />
        </FilterCollapse>
      </CardContent>
    </Card>
  );
}
