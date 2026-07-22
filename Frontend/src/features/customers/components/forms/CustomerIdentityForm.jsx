// src/features/customers/components/forms/CustomerIdentityForm.jsx
import { User, Upload, X, ZoomIn, Tag } from "lucide-react";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import { useState } from "react";

export default function CustomerIdentityForm({
  register,
  errors,
  imagePreview,
  onImageChange,
  onRemoveImage,
}) {
  const [lightboxOpen, setLightboxOpen] = useState(false);

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

          {/* بخش تصویر */}
          <div className="flex flex-col items-center gap-3 shrink-0 w-full sm:w-auto">
            <div className="relative group">
              <div
                className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-2xl border-2 border-dashed border-border transition-all flex items-center justify-center overflow-hidden bg-muted/30 shadow-inner cursor-pointer"
                onClick={() =>
                  imagePreview
                    ? setLightboxOpen(true)
                    : document.getElementById("image").click()
                }
              >
                {imagePreview ? (
                  <>
                    <img
                      src={imagePreview}
                      alt="عکس مشتری"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex flex-col items-center justify-center gap-1">
                      <ZoomIn className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                      <span className="text-[10px] sm:text-xs text-white font-medium">
                        بزرگ‌نمایی
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex flex-col items-center gap-1.5 text-muted-foreground px-2">
                      <User className="h-8 w-8 sm:h-10 sm:w-10 stroke-[1.5]" />
                      <span className="text-[10px] sm:text-xs font-medium text-center leading-tight">
                        بدون تصویر
                      </span>
                    </div>
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex flex-col items-center justify-center gap-1">
                      <Upload className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                      <span className="text-[10px] sm:text-xs text-white font-medium">
                        آپلود
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 w-full">
              <Label
                htmlFor="image"
                className="cursor-pointer inline-flex items-center justify-center gap-1.5 h-8 sm:h-9 px-3 sm:px-4 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95 transition-all text-xs sm:text-sm font-medium shadow-sm hover:shadow-md select-none"
              >
                <Upload className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                {imagePreview ? "تغییر عکس" : "بارگذاری عکس"}
              </Label>

              <Input
                id="image"
                type="file"
                accept="image/*"
                className="hidden"
                {...register("image")}
                onChange={onImageChange}
              />

              {imagePreview && (
                <Button
                  type="button"
                  variant="outline"
                  className="h-8 sm:h-9 w-8 sm:w-9 p-0 rounded-lg border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50 active:scale-95 transition-all"
                  onClick={onRemoveImage}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>

            {lightboxOpen && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
                onClick={() => setLightboxOpen(false)}
              >
                <div
                  className="relative max-w-sm sm:max-w-md md:max-w-lg w-full"
                  onClick={(e) => e.stopPropagation()}
                >
                  <img
                    src={imagePreview}
                    alt="عکس مشتری"
                    className="w-full h-auto rounded-2xl shadow-2xl"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    className="absolute -top-3 -right-3 h-8 w-8 p-0 rounded-full bg-white text-black hover:bg-white/90 shadow-md"
                    onClick={() => setLightboxOpen(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
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
                  {...register("firstName", { required: "وارد کردن نام الزامی است" })}
                />
                {errors.firstName && (
                  <span className="text-xs text-destructive block mt-1 font-medium">
                    {errors.firstName.message}
                  </span>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="lastName" className="text-sm font-medium">
                  نام خانوادگی <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="lastName"
                  placeholder="نام خانوادگی"
                  className="h-10 rounded-lg transition-all"
                  {...register("lastName", { required: "وارد کردن نام خانوادگی الزامی است" })}
                />
                {errors.lastName && (
                  <span className="text-xs text-destructive block mt-1 font-medium">
                    {errors.lastName.message}
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

            <div className="space-y-1.5">
              <Label htmlFor="Description" className="text-sm font-medium">
                توضیحات
              </Label>
              <Textarea
                id="Description"
                placeholder="یادداشت یا توضیحات مربوط به مشتری..."
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