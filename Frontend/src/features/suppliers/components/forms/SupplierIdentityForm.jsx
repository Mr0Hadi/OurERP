// src/features/suppliers/components/forms/SupplierIdentityForm.jsx
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
import ImageUploadField from "@/shared/components/files/ImageUploadField";

export default function SupplierIdentityForm({ register, imageUpload }) {
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
                  نام مسئول
                </Label>
                <Input
                  id="firstName"
                  placeholder="نام"
                  className="h-10 rounded-lg transition-all"
                  {...register("firstName")}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="lastName" className="text-sm font-medium">
                  نام خانوادگی
                </Label>
                <Input
                  id="lastName"
                  placeholder="نام خانوادگی"
                  className="h-10 rounded-lg transition-all"
                  {...register("lastName")}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="companyName" className="text-sm font-medium">
                  نام شرکت
                </Label>
                <Input
                  id="companyName"
                  placeholder="نام شرکت"
                  className="h-10 rounded-lg transition-all"
                  {...register("companyName")}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-sm font-medium">
                  شماره تماس
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                  dir="ltr"
                  className="h-10 rounded-lg transition-all input-rtl-placeholder"
                  {...register("phone")}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="Description" className="text-sm font-medium">
                توضیحات
              </Label>
              <Textarea
                id="Description"
                placeholder="یادداشت یا توضیحات مربوط به تامین‌کننده..."
                className="min-h-[70px] rounded-lg transition-all resize-none"
                {...register("Description")}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}