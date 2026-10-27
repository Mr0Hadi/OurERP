import { Navigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { LogOut, ShieldAlert } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { ThemeToggle } from "@/shared/components/theme/ThemeToggle";
import { ROUTES } from "@/shared/constants/routes";

import ChangePasswordForm from "../components/ChangePasswordForm";
import { fullNameOf } from "../domain/userDisplay";
import { useLogoutMutation, useUserInfoQuery } from "../services/queries";
import { useAuthStore } from "../store/authStore";

/**
 * تغییرِ رمزِ اجباری — مدیر رمزِ کاربر را بازنشانی کرده (`mustChangePassword`) و سرور
 * تا تعیینِ رمزِ تازه جز همین را نمی‌پذیرد. بیرونِ پوسته‌ی برنامه (زیرِ `AuthLayout`)
 * است چون منو و صفحه‌ها همه ۴۰۳ می‌گرفتند. بعد از تغییر به مقصدِ `from`.
 */
export default function ChangePasswordPage() {
  const [searchParams] = useSearchParams();
  const from = searchParams.get("from") || ROUTES.DASHBOARD;

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const mustChangePassword = useAuthStore((s) => s.mustChangePassword);
  // `GetUserInfo` در این حالت هم مجاز است؛ فقط برای نشان‌دادنِ «کدام حساب».
  const { data: user } = useUserInfoQuery();
  const logoutMutation = useLogoutMutation();

  if (!isAuthenticated) return <Navigate to={ROUTES.LOGIN} replace />;
  // رمز عوض شد (یا اصلاً لازم نبود): ادامه‌ی کار.
  if (!mustChangePassword) return <Navigate to={from} replace />;

  return (
    <div className="relative flex min-h-svh w-full items-center justify-center overflow-hidden bg-background px-4 pt-16 pb-10 sm:py-10">
      <div className="absolute top-4 left-4 sm:top-6 sm:left-6">
        <ThemeToggle />
      </div>
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-0 -left-20 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="rounded-3xl border border-border/60 bg-card/90 p-5 shadow-xl shadow-black/[0.03] backdrop-blur-sm sm:p-8">
          <div className="mb-6 flex flex-col items-center gap-3 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-warning/15 text-warning">
              <ShieldAlert className="size-6" />
            </div>
            <div className="space-y-1.5">
              <h1 className="text-xl font-bold sm:text-2xl">تعیین رمز عبور جدید</h1>
              <p className="text-sm leading-6 text-muted-foreground">
                رمز عبور {user ? <strong className="text-foreground">{fullNameOf(user)}</strong> : "شما"} توسط
                مدیر بازنشانی شده است. برای ادامه، رمزِ موقتی را که از مدیر گرفته‌اید و یک رمز تازه وارد کنید.
              </p>
            </div>
          </div>

          <ChangePasswordForm
            username={user?.username}
            oldPasswordLabel="رمز عبور موقت"
            submitLabel="ذخیره و ادامه"
            block
            onSuccess={() => toast.success("رمز عبور شما تغییر کرد. خوش آمدید 👋")}
          />

          <Button
            type="button"
            variant="ghost"
            className="mt-3 h-11 w-full text-muted-foreground sm:h-10"
            disabled={logoutMutation.isPending}
            onClick={() => logoutMutation.mutate()}
          >
            <LogOut className="size-4" />
            خروج از حساب
          </Button>
        </div>
      </div>
    </div>
  );
}
