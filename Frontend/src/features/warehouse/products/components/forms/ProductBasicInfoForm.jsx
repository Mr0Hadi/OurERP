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

import {
  useGenerateProductCodeMutation,
  useGenerateProductBarcodeMutation,
} from "../../services/mutations";
import BarcodeScanner from "./BarcodeScanner";
import CategoryManager from "./CategoryManager";
import GenerateFieldButton from "./GenerateFieldButton";
import { PRODUCT_UNIT_LABELS } from "@/shared/domain/enums/productUnit";

export default function ProductBasicInfoForm({
  register,
  control,
  setValue,
  errors,
  categories,
  onAddCategory,
}) {
  // کد کالا و بارکد هر دو از دسته‌بندی انتخاب‌شده ساخته می‌شوند، ولی
  // هرکدام درخواست جداگانه‌ی خودش را می‌زند.
  const category = useWatch({ control, name: "category" });
  const generateCode = useGenerateProductCodeMutation();
  const generateBarcode = useGenerateProductBarcodeMutation();

  const handleGenerateCode = () => {
    generateCode.mutate(
      { category },
      {
        onSuccess: ({ code }) =>
          setValue("code", code, { shouldDirty: true }),
      }
    );
  };

  const handleGenerateBarcode = () => {
    generateBarcode.mutate(
      { category },
      {
        onSuccess: ({ barcode }) =>
          setValue("barcode", barcode, { shouldDirty: true }),
      }
    );
  };

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

        <div className="space-y-2">
          <Label htmlFor="code">کد کالا</Label>
          <div className="flex gap-2">
            <Input
              id="code"
              className="flex-1"
              placeholder="مثال: PRD-102"
              {...register("code")}
            />
            <GenerateFieldButton
              onClick={handleGenerateCode}
              isPending={generateCode.isPending}
              title="تولید خودکار کد کالا"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="barcode">بارکد</Label>
          <Controller
            name="barcode"
            control={control}
            render={({ field }) => (
              <BarcodeScanner
                value={field.value}
                onChange={field.onChange}
                action={
                  <GenerateFieldButton
                    onClick={handleGenerateBarcode}
                    isPending={generateBarcode.isPending}
                    title="تولید خودکار بارکد"
                  />
                }
              />
            )}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">دسته‌بندی</Label>
          <Controller
            name="category"
            control={control}
            render={({ field }) => (
              <CategoryManager
                value={field.value}
                onChange={field.onChange}
                categories={categories}
                onAddCategory={onAddCategory}
              />
            )}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="brand">برند</Label>
          <Input id="brand" placeholder="مثال: ایساکو" {...register("brand")} />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="unit">واحد شمارش</Label>
          <Controller
            name="unit"
            control={control}
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
        </div>
      </CardContent>
    </Card>
  );
}
