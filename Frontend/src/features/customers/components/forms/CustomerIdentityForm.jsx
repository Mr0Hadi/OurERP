// src/features/customers/components/forms/CustomerIdentityForm.jsx
import { User, Tag } from "lucide-react";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Textarea } from "@/shared/components/ui/textarea";
import ImageUploadField from "@/shared/components/files/ImageUploadField";
import {
  mobileRules,
  persianNameRules,
} from "@/shared/utils/validationRules";

/** پیام خطای زیرِ فیلد — همان متنی که سرور هم برمی‌گرداند. */
function FieldError({ error }) {
  if (!error) return null;
  return (
    <span className="text-xs text-destructive block mt-1 font-medium">
      {error.message}
    </span>
  );
}

const Required = () => <span className="text-destructive">*</span>;

/**
 * قوانین فیلدها عیناً از `CreateCustomerCommandValidator` گرفته شده‌اند:
 * نام و نام خانوادگی فقط فارسی، و شماره تماس **اجباری و فقط موبایل**
 * (`^09\d{9}$`) — قبلاً اختیاری بود و اصلاً هم ذخیره نمی‌شد.
 */
export default function CustomerIdentityForm({ register, errors, imageUpload }) {
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
              label="عکس مشتری"
              emptyIcon={User}
              // خطا همان لحظه کنارِ فیلد دیده می‌شود؛ toast اضافی لازم نیست.
              className="w-full sm:w-auto"
            />
          </div>

          {/* فیلدهای فرم */}
          <div className="flex-1 w-full space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="firstName" className="text-sm font-medium">
                  نام <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="firstName"
                  placeholder="نام"
                  className="h-10 rounded-lg transition-all"
                  {...register("firstName", persianNameRules("نام"))}
                />
                <FieldError error={errors.firstName} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="lastName" className="text-sm font-medium">
                  نام خانوادگی <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="lastName"
                  placeholder="نام خانوادگی"
                  className="h-10 rounded-lg transition-all"
                  {...register("lastName", persianNameRules("نام خانوادگی"))}
                />
                <FieldError error={errors.lastName} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="phoneNumber" className="text-sm font-medium">
                  شماره تماس (موبایل) <Required />
                </Label>
                <Input
                  id="phoneNumber"
                  type="tel"
                  placeholder="09123456789"
                  dir="ltr"
                  className="h-10 rounded-lg transition-all input-rtl-placeholder"
                  {...register("phoneNumber", mobileRules())}
                />
                <FieldError error={errors.phoneNumber} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="referralCode" className="text-sm font-medium">
                  کد معرف
                </Label>
                <div className="relative">
                  <Tag className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="referralCode"
                    dir="ltr"
                    placeholder="REF001"
                    className="h-10 pr-10 rounded-lg transition-all input-rtl-placeholder"
                    {...register("referralCode")}
                  />
                </div>
              </div>
            </div>

            {/* سه شناسه‌ی حقوقی — اختیاری، ولی سرور از روز اول ستونشان
                را داشته و فرم اصلاً نمایششان نمی‌داد. */}
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
                <Input
                  id="nationalId"
                  dir="ltr"
                  placeholder="10101234567"
                  className="h-10 rounded-lg transition-all input-rtl-placeholder"
                  {...register("nationalId")}
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
                placeholder="یادداشت یا توضیحات مربوط به مشتری..."
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