import { Controller, useWatch } from "react-hook-form";

import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Badge } from "@/shared/components/ui/badge";
import { Checkbox } from "@/shared/components/ui/checkbox";
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
import { formatPayload } from "@/shared/domain/barcode/productCode";
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
  const barcode = useWatch({ control, name: "barcode" });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-lg">اطلاعات پایه</CardTitle>
        {isIncomplete && (
          <Badge
            variant="outline"
            className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-400"
          >
            ناقص — برند و قیمت‌ها را کامل کنید
          </Badge>
        )}
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

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="englishName">نام انگلیسی</Label>
          <Input
            id="englishName"
            dir="ltr"
            placeholder="e.g. Front Brake Pad"
            {...register("englishName")}
            className={errors.englishName ? "border-red-500" : ""}
          />
          {errors.englishName && (
            <span className="text-xs text-red-500">
              {errors.englishName.message}
            </span>
          )}
        </div>

        {showGeneratedCodes && (
          <>
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
          </>
        )}

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
            برند {!isIncomplete && <span className="text-destructive">*</span>}
          </Label>
          <Input
            id="brand"
            placeholder="مثال: ایساکو"
            {...register("brand", {
              required: isIncomplete ? false : "وارد کردن برند الزامی است",
            })}
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
      </CardContent>
    </Card>
  );
}
