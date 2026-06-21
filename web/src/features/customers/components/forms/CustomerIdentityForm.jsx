import { User, Upload, X, Camera } from "lucide-react";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";

export default function CustomerIdentityForm({
  register,
  errors,
  avatarPreview,
  onAvatarChange,
  onRemoveAvatar,
}) {
  return (
    <Card className="overflow-hidden border-muted/60 shadow-sm">
      <CardHeader className="border-b border-muted/40 bg-muted/10 pb-4">
        <CardTitle className="flex items-center text-lg font-semibold text-foreground/90">
          <User className="ml-2 h-5 w-5 text-primary" />
          اطلاعات هویتی و تماس
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row gap-8 items-start">
          
          {/* بخش تصویر مشتری - غیر دایره‌ای و مدرن */}
          <div className="flex flex-col items-center gap-3 w-full md:w-auto shrink-0">
            <div className="relative group w-36 h-36 rounded-2xl border-2 border-dashed border-muted-foreground/20 hover:border-primary/50 transition-colors flex items-center justify-center overflow-hidden bg-muted/40 shadow-inner">
              {avatarPreview ? (
                <>
                  <img
                    src={avatarPreview}
                    alt="عکس مشتری"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Camera className="h-6 w-6 text-white" />
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground/60">
                  <User className="h-12 w-12 stroke-[1.5]" />
                  <span className="text-xs">بدون تصویر</span>
                </div>
              )}
            </div>

            {/* دکمه‌های مدیریت تصویر */}
            <div className="flex items-center gap-2 w-full justify-center">
              <Label
                htmlFor="avatar"
                className="cursor-pointer inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/95 transition-all text-xs font-medium shadow-sm w-36"
              >
                <Upload className="h-3.5 w-3.5" />
                {avatarPreview ? "تغییر عکس" : "بارگذاری"}
              </Label>
              <Input
                id="avatar"
                type="file"
                accept="image/*"
                className="hidden"
                {...register("avatar")}
                onChange={onAvatarChange}
              />
              {avatarPreview && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 px-3 text-destructive border-destructive/20 hover:bg-destructive/10 hover:text-destructive rounded-lg"
                  onClick={onRemoveAvatar}
                >
                  <X className="h-3.5 w-3.5 ml-1" />
                  حذف
                </Button>
              )}
            </div>
          </div>

          {/* فیلدهای فرم */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 flex-1 w-full">
            <div className="space-y-2">
              <Label htmlFor="firstName" className="text-sm font-medium text-foreground/80">
                نام <span className="text-destructive">*</span>
              </Label>
              <Input
                id="firstName"
                placeholder="مثال: علی"
                className="h-10 focus-visible:ring-primary/30"
                {...register("firstName", { required: "وارد کردن نام الزامی است" })}
              />
              {errors.firstName && (
                <span className="text-xs text-destructive block mt-1">{errors.firstName.message}</span>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName" className="text-sm font-medium text-foreground/80">
                نام خانوادگی <span className="text-destructive">*</span>
              </Label>
              <Input
                id="lastName"
                placeholder="مثال: محمدی"
                className="h-10 focus-visible:ring-primary/30"
                {...register("lastName", { required: "وارد کردن نام خانوادگی الزامی است" })}
              />
              {errors.lastName && (
                <span className="text-xs text-destructive block mt-1">{errors.lastName.message}</span>
              )}
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="phone" className="text-sm font-medium text-foreground/80">شماره تماس</Label>
              <Input 
                id="phone" 
                type="tel" 
                placeholder="۰۹۱۲۳۴۵۶۷۸۹" 
                dir="ltr" 
                className="h-10 text-left focus-visible:ring-primary/30"
                {...register("phone")} 
              />
            </div>
          </div>

        </div>
      </CardContent>
    </Card>
  );
}
