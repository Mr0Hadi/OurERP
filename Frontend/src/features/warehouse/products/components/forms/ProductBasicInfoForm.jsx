// src/features/warehouse/products/components/forms/ProductBasicInfoForm.jsx
import { Controller, useWatch } from "react-hook-form";

import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

import CategoryManager from "./CategoryManager";
import { formatPayload } from "@/shared/services/barcode/productCode";
import { PRODUCT_UNIT_LABELS } from "@/shared/domain/enums/productUnit";

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
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value || ""}
        readOnly
        disabled={!value}
        placeholder={emptyHint}
        className="font-mono text-start"
      />
      <span className="text-[11px] text-muted-foreground">
        این مقدار را سرور هنگام ثبت کالا می‌سازد و قابل ویرایش نیست.
      </span>
    </div>
  );
}

export default function ProductBasicInfoForm({ register, control, errors }) {
  const code = useWatch({ control, name: "code" });
  const barcode = useWatch({ control, name: "barcode" });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">اطلاعات پایه</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2 md:col-span-2">
          <Input
            id="name"
            placeholder="مثال: لنت ترمز جلو پراید"
            {...register("name", {
              required: "وارد کردن نام کالا الزامی است",
            })}
            className={errors.name ? "border-red-500" : ""}
          />
          {errors.name && (
            <span className="text-xs text-red-500">{errors.name.message}</span>
          )}
        </div>

        <ReadOnlyCodeField
          id="code"
          label="کد کالا"
          value={code}
          emptyHint="پس از ثبت کالا ساخته می‌شود"
        />

        <ReadOnlyCodeField
          id="barcode"
          label="بارکد"
          value={formatPayload(barcode)}
          emptyHint="پس از ثبت کالا ساخته می‌شود"
        />

        <div className="space-y-2">
          <Label htmlFor="productCategoryId">
            دسته‌بندی <span className="text-destructive">*</span>
          </Label>
          <Controller
            name="productCategoryId"
            control={control}
            rules={{ required: "انتخاب دسته‌بندی الزامی است" }}
            render={({ field }) => (
              <CategoryManager value={field.value} onChange={field.onChange} />
            )}
          />
          {errors.productCategoryId && (
            <span className="text-xs text-red-500">
              {errors.productCategoryId.message}
            </span>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="brand">
            برند <span className="text-destructive">*</span>
          </Label>
          <Input
            id="brand"
            placeholder="مثال: ایساکو"
            {...register("brand", { required: "وارد کردن برند الزامی است" })}
            className={errors.brand ? "border-red-500" : ""}
          />
          {errors.brand && (
            <span className="text-xs text-red-500">{errors.brand.message}</span>
          )}
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="unit">
            واحد شمارش <span className="text-destructive">*</span>
          </Label>
          <Controller
            name="unit"
            control={control}
            rules={{ required: "انتخاب واحد شمارش الزامی است" }}
            render={({ field }) => (
              <Select
                value={field.value === "" || field.value == null ? "" : String(field.value)}
                onValueChange={(value) => field.onChange(Number(value))}
              >
                <SelectTrigger dir="rtl">
                  <SelectValue placeholder="انتخاب واحد" />
                </SelectTrigger>
                <SelectContent dir="rtl">
                  {Object.entries(PRODUCT_UNIT_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.unit && (
            <span className="text-xs text-red-500">{errors.unit.message}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
