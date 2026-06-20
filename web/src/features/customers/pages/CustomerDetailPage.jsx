// src/features/customers/pages/CustomerEditPage.jsx
import { useMemo, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Save,
  User,
  MapPin,
  CreditCard,
  Image as ImageIcon,
  Map,
} from "lucide-react";
import { useCustomerQuery } from "../services/queries";
import { useUpdateCustomerMutation } from "../services/mutations";
import { useHeaderStore } from "#/shared/store/headerStore";

// کامپوننت‌های UI (مسیرها را بر اساس پروژه خود تنظیم کنید)
import { Button } from "@/shared/components/ui/button";
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
import CustomerDetailLoading from "../components/CustomerDetailLoading";

export default function CustomerDetailPage() {
  const { id } = useParams(); 
  const navigate = useNavigate();

  const setHeader = useHeaderStore((state) => state.setHeader);
  const clearHeader = useHeaderStore((state) => state.clearHeader);

  useEffect(() => {
    setHeader({
      title: "جزئیات و ویرایش مشتری",
      showBack: true,
      onBack: () => navigate(-1),
    });

    return () => clearHeader();
  }, [navigate, setHeader, clearHeader]);

  // گرفتن اطلاعات مشتری
  const { data: customer, isLoading, isError } = useCustomerQuery(id);
  // هوک ویرایش
  const updateMutation = useUpdateCustomerMutation();

  // تبدیل دیتای دریافتی از سرور به فرمتی که فرم نیاز دارد
  const formValues = useMemo(() => {
    if (!customer) return undefined;

    let balanceType = "none";
    let balanceAmount = "";

    if (customer.balance < 0) {
      balanceType = "debtor";
      balanceAmount = Math.abs(customer.balance).toString();
    } else if (customer.balance > 0) {
      balanceType = "creditor";
      balanceAmount = Math.abs(customer.balance).toString();
    }

    return {
      firstName: customer.firstName || "",
      lastName: customer.lastName || "",
      phone: customer.phone || "",
      address: customer.address || "",
      lat: customer.coordinates?.lat?.toString() || "",
      lng: customer.coordinates?.lng?.toString() || "",
      postalCode: customer.postalCode || "",
      balanceType,
      balanceAmount,
      // عکس را در حالت ویرایش پیچیده‌تر است، فعلا null میگذاریم مگر کاربر فایل جدید انتخاب کند
      avatar: null,
    };
  }, [customer]);

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
    values: formValues,
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

    const updatedData = {
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
      // در دنیای واقعی: اگر فایل جدید بود آپلود کن، اگر نه همون آدرس قبلی بماند
    };

    updateMutation.mutate(
      { id, data: updatedData },
      {
        onSuccess: () => navigate("/customers"), // بازگشت به لیست بعد از موفقیت
      }
    );
  };

  // حالت‌های لودینگ و خطا
  if (isLoading) {
    return <CustomerDetailLoading />;
  }

  if (isError || !customer) {
    return (
      <div className="text-center py-20 text-red-500">
        مشکلی در دریافت اطلاعات مشتری به وجود آمد.
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* اطلاعات پایه */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <User className="ml-2 h-5 w-5" />
              اطلاعات هویتی و تماس
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="firstName">
                نام <span className="text-red-500">*</span>
              </Label>
              <Input
                id="firstName"
                {...register("firstName", {
                  required: "وارد کردن نام الزامی است",
                })}
              />
              {errors.firstName && (
                <span className="text-sm text-red-500">
                  {errors.firstName.message}
                </span>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">
                نام خانوادگی <span className="text-red-500">*</span>
              </Label>
              <Input
                id="lastName"
                {...register("lastName", {
                  required: "وارد کردن نام خانوادگی الزامی است",
                })}
              />
              {errors.lastName && (
                <span className="text-sm text-red-500">
                  {errors.lastName.message}
                </span>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">شماره تماس</Label>
              <Input id="phone" type="tel" dir="ltr" {...register("phone")} />
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
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <CreditCard className="ml-2 h-5 w-5" />
              وضعیت مالی
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="balanceType">وضعیت حساب</Label>
              <Select
                value={balanceType || "none"}
                onValueChange={(val) => setValue("balanceType", val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="وضعیت را انتخاب کنید" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">بی‌حساب (صفر)</SelectItem>
                  <SelectItem value="creditor">
                    طلبکار (از ما طلب دارد)
                  </SelectItem>
                  <SelectItem value="debtor">
                    بدهکار (به ما بدهکار است)
                  </SelectItem>
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
                  {...register("balanceAmount", {
                    required:
                      balanceType !== "none"
                        ? "وارد کردن مبلغ الزامی است"
                        : false,
                  })}
                />
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
              <Input id="address" {...register("address")} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="postalCode">کد پستی</Label>
                <Input id="postalCode" dir="ltr" {...register("postalCode")} />
              </div>

              <div className="space-y-2">
                <Label>مختصات جغرافیایی</Label>
                <div className="flex gap-2">
                  <Input dir="ltr" placeholder="Lat" {...register("lat")} />
                  <Input dir="ltr" placeholder="Lng" {...register("lng")} />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      window.open("https://maps.google.com", "_blank")
                    }
                  >
                    <Map className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-4">
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate("/customers")}
          >
            انصراف
          </Button>
          <Button type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? (
              "در حال ذخیره..."
            ) : (
              <>
                <Save className="ml-2 h-4 w-4" />
                ذخیره تغییرات
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
