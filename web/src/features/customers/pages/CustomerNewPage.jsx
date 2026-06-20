// src/features/customers/pages/CustomerNewPage.jsx
import React from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Save, User, MapPin, CreditCard, Image as ImageIcon, Map } from "lucide-react";
import { useCreateCustomerMutation } from "../services/mutations";

// کامپوننت‌های UI
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";

export default function CustomerNewPage() {
  const navigate = useNavigate();
  const createMutation = useCreateCustomerMutation();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      address: "",
      lat: "",
      lng: "",
      postalCode: "",
      balanceType: "none",
      balanceAmount: "",
      avatar: null,
    },
  });

  const balanceType = watch("balanceType");

  const onSubmit = (data) => {
    let finalBalance = 0;
    const amount = Number(data.balanceAmount) || 0;
    
    if (data.balanceType === "debtor") {
      finalBalance = -Math.abs(amount);
    } else if (data.balanceType === "creditor") {
      finalBalance = Math.abs(amount);
    }

    const newCustomerData = {
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone || null,
      address: data.address || null,
      postalCode: data.postalCode || null,
      balance: finalBalance,
      coordinates: {
        lat: data.lat ? parseFloat(data.lat) : null,
        lng: data.lng ? parseFloat(data.lng) : null,
      },
      avatar: data.avatar?.[0] ? URL.createObjectURL(data.avatar[0]) : null, 
    };

    createMutation.mutate(newCustomerData);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">افزودن مشتری جدید</h1>
          <p className="text-muted-foreground mt-1">
            اطلاعات مشتری جدید را در فرم زیر وارد کنید.
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate("/customers")}>
          <ArrowRight className="ml-2 h-4 w-4" />
          بازگشت
        </Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* اطلاعات پایه */}
        <Card>
          {/* CardHeader و CardContent برای اطلاعات هویتی (بدون تغییر) */}
           <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <User className="ml-2 h-5 w-5" />
              اطلاعات هویتی و تماس
            </CardTitle>
            <CardDescription>نام و نام خانوادگی الزامی هستند.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="firstName">نام <span className="text-red-500">*</span></Label>
              <Input
                id="firstName"
                placeholder="مثال: علی"
                {...register("firstName", { required: "وارد کردن نام الزامی است" })}
              />
              {errors.firstName && <span className="text-sm text-red-500">{errors.firstName.message}</span>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">نام خانوادگی <span className="text-red-500">*</span></Label>
              <Input
                id="lastName"
                placeholder="مثال: محمدی"
                {...register("lastName", { required: "وارد کردن نام خانوادگی الزامی است" })}
              />
              {errors.lastName && <span className="text-sm text-red-500">{errors.lastName.message}</span>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">شماره تماس</Label>
              <Input
                id="phone"
                type="tel"
                dir="ltr"
                placeholder="09123456789"
                {...register("phone")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="avatar">عکس مشتری</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="avatar"
                  type="file"
                  accept="image/*"
                  {...register("avatar")}
                  className="cursor-pointer"
                />
                <ImageIcon className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* اطلاعات مالی */}
        <Card>
           {/* CardHeader و CardContent برای اطلاعات مالی (بدون تغییر) */}
           <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <CreditCard className="ml-2 h-5 w-5" />
              وضعیت مالی اولیه
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="balanceType">وضعیت حساب</Label>
              <Select 
                onValueChange={(val) => setValue("balanceType", val)} 
                defaultValue="none"
              >
                <SelectTrigger>
                  <SelectValue placeholder="وضعیت را انتخاب کنید" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">بی‌حساب (صفر)</SelectItem>
                  <SelectItem value="creditor">طلبکار (از ما طلب دارد)</SelectItem>
                  <SelectItem value="debtor">بدهکار (به ما بدهکار است)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {balanceType !== "none" && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                <Label htmlFor="balanceAmount">مبلغ (تومان)</Label>
                <Input
                  id="balanceAmount"
                  type="number"
                  min="0"
                  dir="ltr"
                  placeholder="مثال: 5000000"
                  {...register("balanceAmount", { 
                    required: balanceType !== "none" ? "وارد کردن مبلغ الزامی است" : false 
                  })}
                />
                {errors.balanceAmount && <span className="text-sm text-red-500">{errors.balanceAmount.message}</span>}
              </div>
            )}
          </CardContent>
        </Card>

        {/* اطلاعات آدرس */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <MapPin className="ml-2 h-5 w-5" />
              آدرس و موقعیت مکانی
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="address">آدرس کامل</Label>
              <Input
                id="address"
                placeholder="استان، شهر، خیابان، پلاک..."
                {...register("address")}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="postalCode">کد پستی</Label>
                <Input
                  id="postalCode"
                  dir="ltr"
                  placeholder="1234567890"
                  {...register("postalCode")}
                />
              </div>

              <div className="space-y-2">
                  <Label>مختصات جغرافیایی</Label>
                  <div className="flex gap-2">
                    <Input dir="ltr" placeholder="Lat: 35.6892" {...register("lat")} />
                    <Input dir="ltr" placeholder="Lng: 51.3890" {...register("lng")} />
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="icon"
                      onClick={() => window.open('https://maps.google.com', '_blank')}
                      aria-label="Open Google Maps"
                    >
                      <Map className="h-4 w-4" />
                    </Button>
                  </div>
                   <p className="text-xs text-muted-foreground mt-2">
                    با کلیک روی آیکون نقشه، گوگل مپ باز می‌شود. روی نقطه مورد نظر راست کلیک کرده و مختصات را کپی کنید.
                  </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-4">
          <Button type="button" variant="ghost" onClick={() => navigate("/customers")}>
            انصراف
          </Button>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? (
              "در حال ثبت..."
            ) : (
              <>
                <Save className="ml-2 h-4 w-4" />
                ثبت مشتری
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
