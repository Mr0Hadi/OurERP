// src/features/suppliers/components/forms/SupplierIdentityForm.jsx
import { Controller } from "react-hook-form";
import { User } from "lucide-react";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Textarea } from "@/shared/components/ui/textarea";
import { MobileNumberInput } from "@/shared/components/ui/mobile-number-input";
import { NationalIdInput } from "@/shared/components/ui/national-id-input";
import ImageUploadField from "@/shared/components/files/ImageUploadField";
import {
  mobileRules,
  persianNameRules,
  requiredMessage,
} from "@/shared/utils/validationRules";

/** پیام خطای زیرِ فیلد — همان متنی که سرور هم برمی‌گرداند. */
function FieldError({ error }) {
  if (!error) return null;
  return (
    <span className="text-xs text-destructive block font-medium">
      {error.message}
    </span>
  );
}

const Required = () => <span className="text-destructive">*</span>;

/**
 * فیلدهای اجباری و قوانینشان عیناً از `CreateSupplierCommandValidator`
 * گرفته شده‌اند: نام و نام خانوادگی فقط فارسی، شماره تماس فقط موبایل
 * (`^09\d{9}$`)، و نام شرکت اجباری. بدون این‌ها کاربر کلِ فرم را پر
 * می‌کرد و تازه از سرور خطا می‌گرفت.
 */
export default function SupplierIdentityForm({ register, control, errors, imageUpload }) {
  return (
    <Card className="overflow-hidden shadow-md rounded-2xl pt-0 gap-0">
      <CardHeader className="border-b bg-muted/30 py-4 px-6">
        <CardTitle className="flex items-center gap-2.5 text-lg font-bold">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <User className="h-4.5 w-4.5 text-primary" />
          </div>
          اطلاعات هویتی
        </CardTitle>
      </CardHeader>

      <CardContent className="px-6 py-5">
        <div className="flex flex-col sm:flex-row gap-6 items-start">
          {/* بخش تصویر — کلید در `imageUrl` payload می‌رود، نه خودِ فایل */}
          <div className="shrink-0 w-full sm:w-auto">
            <ImageUploadField
              upload={imageUpload}
              label="تصویر تامین کننده"
              emptyIcon={User}
              className="w-full sm:w-auto"
            />
          </div>

          {/* فیلدهای فرم */}
          <div className="flex-1 w-full space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="firstName" className="text-sm font-medium">
                  نام مسئول <Required />
                </Label>
                <Input
                  id="firstName"
                  placeholder="نام"
                  className="h-10 rounded-lg transition-all"
                  {...register("firstName", persianNameRules("نام"))}
                />
                <FieldError error={errors?.firstName} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="lastName" className="text-sm font-medium">
                  نام خانوادگی <Required />
                </Label>
                <Input
                  id="lastName"
                  placeholder="نام خانوادگی"
                  className="h-10 rounded-lg transition-all"
                  {...register("lastName", persianNameRules("نام خانوادگی"))}
                />
                <FieldError error={errors?.lastName} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="companyName" className="text-sm font-medium">
                  نام شرکت <Required />
                </Label>
                <Input
                  id="companyName"
                  placeholder="نام شرکت"
                  className="h-10 rounded-lg transition-all"
                  {...register("companyName", {
                    required: requiredMessage("نام شرکت"),
                  })}
                />
                <FieldError error={errors?.companyName} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-sm font-medium">
                  شماره تماس <Required />
                </Label>
                <Controller
                  name="phone"
                  control={control}
                  rules={mobileRules()}
                  render={({ field }) => (
                    <MobileNumberInput
                      id="phone"
                      value={field.value}
                      onValueChange={field.onChange}
                    />
                  )}
                />
                <FieldError error={errors?.phone} />
              </div>
            </div>

            {/* سه شناسه‌ی حقوقی — همگی اختیاری‌اند، ولی سرور از روز اول
                ستونشان را داشته و فرم اصلاً نمایششان نمی‌داد. */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="economicCode" className="text-sm font-medium">
                  کد اقتصادی
                </Label>
                <Input
                  id="economicCode"
                  dir="ltr"
                  placeholder="14001234567"
                  className="h-10 rounded-lg transition-all input-rtl-placeholder"
                  {...register("economicCode")}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="nationalId" className="text-sm font-medium">
                  شناسه ملی
                </Label>
                <Controller
                  name="nationalId"
                  control={control}
                  render={({ field }) => (
                    <NationalIdInput
                      id="nationalId"
                      value={field.value}
                      onValueChange={field.onChange}
                    />
                  )}
                />
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="registrationNumber"
                  className="text-sm font-medium"
                >
                  شماره ثبت
                </Label>
                <Input
                  id="registrationNumber"
                  dir="ltr"
                  placeholder="123456"
                  className="h-10 rounded-lg transition-all input-rtl-placeholder"
                  {...register("registrationNumber")}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-sm font-medium">
                توضیحات
              </Label>
              <Textarea
                id="description"
                placeholder="یادداشت یا توضیحات مربوط به تامین‌کننده..."
                className="min-h-[70px] rounded-lg transition-all resize-none"
                {...register("description")}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}