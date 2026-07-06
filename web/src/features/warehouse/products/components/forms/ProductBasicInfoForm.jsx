// src/features/warehouse/products/components/forms/ProductBasicInfoForm.jsx
import { Controller } from "react-hook-form";

import { Input } from "#/shared/components/ui/input";
import { Label } from "#/shared/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "#/shared/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/shared/components/ui/select";

import BarcodeScanner from "./BarcodeScanner";
import CategoryManager from "./CategoryManager";

export default function ProductBasicInfoForm({
  register,
  control,
  errors,
  categories,
  onAddCategory,
}) {
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
          <Input id="code" placeholder="مثال: PRD-102" {...register("code")} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="barcode">بارکد</Label>
          <Controller
            name="barcode"
            control={control}
            render={({ field }) => (
              <BarcodeScanner value={field.value} onChange={field.onChange} />
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
              <Select value={field.value ?? ""} onValueChange={field.onChange}>
                <SelectTrigger dir="rtl">
                  <SelectValue placeholder="انتخاب واحد" />
                </SelectTrigger>
                <SelectContent dir="rtl">
                  <SelectItem value="عدد">عدد</SelectItem>
                  <SelectItem value="دست">دست</SelectItem>
                  <SelectItem value="لیتر">لیتر</SelectItem>
                  <SelectItem value="کیلوگرم">کیلوگرم</SelectItem>
                  <SelectItem value="کارتن">کارتن</SelectItem>
                  <SelectItem value="کیت">کیت</SelectItem>
                  <SelectItem value="بسته">بسته</SelectItem>
                  <SelectItem value="جفت">جفت</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
}
