import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Eye,
  EyeOff,
  Loader2,
  Lock,
  User,
  Boxes,
  Truck,
  ShieldCheck,
  Gauge,
  ArrowLeft,
} from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { ModeToggle } from "@/shared/components/theme/mode-toggle";

import { useLoginMutation } from "../services/queries";
import { ROUTES } from "@/shared/constants/routes";

const FEATURES = [
  {
    icon: Boxes,
    title: "مدیریت هوشمند انبار",
    desc: "کنترل لحظه‌ای موجودی قطعات یدکی در چند انبار",
  },
  {
    icon: Truck,
    title: "خرید و فروش عمده",
    desc: "مدیریت یکپارچه سفارشات تامین‌کنندگان و مشتریان",
  },
  {
    icon: Gauge,
    title: "گزارش‌های دقیق",
    desc: "تحلیل سود و زیان و عملکرد فروش به‌صورت آنی",
  },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: { username: "", password: "" },
    mode: "onTouched",
  });

  const { mutate: login, isPending } = useLoginMutation();

  const onSubmit = (values) => {
    login(values, {
      onSuccess: () => {
        toast.success("خوش آمدید 👋");
        const from = searchParams.get("from") || ROUTES.DASHBOARD;
        navigate(from, { replace: true });
      },
      onError: (error) => {
        const message =
          error?.response?.data?.message ||
          "نام کاربری یا رمز عبور اشتباه است";
        toast.error(message);
      },
    });
  };

  return (
    <div className="relative flex min-h-svh w-full overflow-hidden bg-background">
      {/* ───── پنل برندینگ (فقط دسکتاپ) ───── */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-primary p-12 text-primary-foreground lg:flex">
        {/* شکل‌های دکوراتیو پس‌زمینه */}
        <div className="pointer-events-none absolute inset-0 opacity-90">
          <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute top-1/3 left-1/4 h-40 w-40 rounded-full border border-white/10" />
          <div className="absolute top-1/4 right-1/3 h-24 w-24 rounded-full border border-white/10" />
          <svg
            className="absolute inset-0 h-full w-full opacity-[0.07]"
            width="100%"
            height="100%"
          >
            <defs>
              <pattern
                id="grid"
                width="40"
                height="40"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 40 0 L 0 0 0 40"
                  fill="none"
                  stroke="white"
                  strokeWidth="1"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* لوگو و نام برند */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm ring-1 ring-white/20">
            <Gauge className="h-6 w-6" strokeWidth={2.2} />
          </div>
          <div>
            <p className="text-lg font-bold leading-tight">پاسارگارد موتور پارت</p>
            <p className="text-xs text-primary-foreground/70">
              سامانه جامع مدیریت انبار و فروش
            </p>
          </div>
        </div>

        {/* پیام مرکزی */}
        <div className="relative z-10 space-y-8">
          <div className="space-y-3">
            <h1 className="text-3xl font-extrabold leading-tight xl:text-4xl">
              مدیریت یکپارچه
              <br />
              لوازم یدکی خودرو
            </h1>
            <p className="max-w-md text-sm leading-7 text-primary-foreground/75">
              از انبارداری تا فاکتور فروش، همه‌چیز در یک پلتفرم — سریع،
              دقیق و قابل اعتماد برای تیم پاسارگارد موتور پارت.
            </p>
          </div>

          <div className="space-y-4">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-3">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
                  <Icon className="h-4.5 w-4.5" strokeWidth={2} />
                </div>
                <div>
                  <p className="text-sm font-semibold">{title}</p>
                  <p className="text-xs text-primary-foreground/65">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* فوتر پنل */}
        <div className="relative z-10 flex items-center gap-2 text-xs text-primary-foreground/60">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>اطلاعات شما با رمزنگاری استاندارد محافظت می‌شود</span>
        </div>
      </div>

      {/* ───── پنل فرم ───── */}
      <div className="relative flex w-full flex-1 flex-col items-center justify-center px-6 py-10 lg:w-1/2">
        {/* دکمه تغییر تم */}
        <div className="absolute top-6 left-6">
          <ModeToggle />
        </div>

        {/* بک‌گراند دکوراتیو موبایل */}
        <div className="pointer-events-none absolute inset-0 lg:hidden">
          <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute bottom-0 -left-20 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        </div>

        <div className="relative z-10 w-full max-w-sm">
          {/* هدر برند - فقط موبایل */}
          <div className="mb-8 flex flex-col items-center gap-2 lg:hidden">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
              <Gauge className="h-6 w-6" strokeWidth={2.2} />
            </div>
            <p className="text-base font-bold">پاسارگارد موتور پارت</p>
          </div>

          {/* کارت فرم شیشه‌ای */}
          <div className="rounded-3xl border border-border/60 bg-card/80 p-8 shadow-xl shadow-black/[0.03] backdrop-blur-sm">
            <div className="mb-7 space-y-1.5 text-center">
              <h2 className="text-2xl font-bold text-foreground">
                ورود به سامانه
              </h2>
              <p className="text-sm text-muted-foreground">
                برای دسترسی به پنل مدیریت وارد شوید
              </p>
            </div>

            <form
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-5"
              noValidate
            >
              {/* نام کاربری */}
              <div className="space-y-2">
                <Label htmlFor="username">نام کاربری</Label>
                <div className="relative">
                  <User className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="username"
                    autoComplete="username"
                    placeholder="مثال: ali.rezaei"
                    className="h-11 rounded-xl pr-10 input-rtl-placeholder"
                    aria-invalid={!!errors.username}
                    {...register("username", {
                      required: "نام کاربری الزامی است",
                      minLength: {
                        value: 3,
                        message: "نام کاربری باید حداقل ۳ کاراکتر باشد",
                      },
                    })}
                  />
                </div>
                {errors.username && (
                  <p className="flex items-center gap-1 text-xs text-destructive">
                    {errors.username.message}
                  </p>
                )}
              </div>

              {/* رمز عبور */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">رمز عبور</Label>
                  <button
                    type="button"
                    className="text-xs font-medium text-primary hover:underline"
                    onClick={() =>
                      toast("برای بازیابی رمز با مدیر سیستم تماس بگیرید")
                    }
                  >
                    فراموشی رمز؟
                  </button>
                </div>
                <div className="relative">
                  <Lock className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="h-11 rounded-xl pr-10 pl-10 input-rtl-placeholder"
                    aria-invalid={!!errors.password}
                    {...register("password", {
                      required: "رمز عبور الزامی است",
                      minLength: {
                        value: 6,
                        message: "رمز عبور باید حداقل ۶ کاراکتر باشد",
                      },
                    })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-destructive">
                    {errors.password.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                disabled={isPending}
                className="group h-11 w-full rounded-xl text-sm font-semibold shadow-lg shadow-primary/20 transition-all hover:shadow-primary/30"
              >
                {isPending ? (
                  <>
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    در حال ورود...
                  </>
                ) : (
                  <>
                    ورود به سامانه
                    <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
                  </>
                )}
              </Button>
            </form>
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} پاسارگارد موتور پارت — تمامی حقوق
            محفوظ است
          </p>
        </div>
      </div>
    </div>
  );
}