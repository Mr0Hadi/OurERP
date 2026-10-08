import { Suspense } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { ArrowRight, WifiOff } from "lucide-react";

import { TooltipProvider } from "@/shared/components/ui/tooltip";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/shared/components/ui/sidebar";
import { Button } from "@/shared/components/ui/button";
import { Spinner } from "@/shared/components/ui/spinner";
import { AppSidebar } from "@/shared/components/layout/AppSidebar";
import { AppBreadcrumb } from "@/shared/components/layout/AppBreadcrumb";
import RouteLoadingOverlay from "@/shared/components/layout/RouteLoadingOverlay";
import { ThemeToggle } from "@/shared/components/theme/ThemeToggle";
import { useHeaderStore } from "@/shared/store/headerStore";
import { useGoBack } from "@/shared/hooks/useGoBack";
import { ROUTES } from "@/shared/constants/routes";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useUserInfoQuery } from "@/features/auth/services/queries";
import PermissionGate from "../routes/PermissionGate";

function ContentSpinner() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <Spinner className="size-8 text-primary" />
    </div>
  );
}

export default function AppLayout() {
  const { title, showBack, onBack } = useHeaderStore();
  // پیش‌فرضِ دکمه‌ی برگشت، صفحه‌ی قبلی است. صفحه‌ها فقط وقتی onBack
  // می‌دهند که پیش از رفتن کاری داشته باشند (مثلاً پاک‌کردن فرم).
  const goBack = useGoBack();

  const location = useLocation();

  // `protectedLoader` فقط یک flagِ پرسیست‌شده در localStorage را چک می‌کند،
  // نه اعتبار واقعی توکن نزد سرور. عمداً منتظرِ تأییدش نمی‌مانیم: برنامه با
  // همان flag بلافاصله رندر می‌شود و کوئریِ نشست (که هر ۴۰۱ را از طریق
  // interceptor به یک تلاشِ رفرش واقعی می‌رساند) در پس‌زمینه می‌دود؛ اگر نشست
  // واقعاً از دست رفته بود، پایین به ورود می‌رویم.
  const {
    isError: sessionFailed,
    error: sessionError,
    refetch: retrySession,
    isFetching: sessionRetrying,
  } = useUserInfoQuery();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const logout = useAuthStore((s) => s.logout);

  // نشست از دست رفته (interceptor رفرش را ناموفق دید و خارج کرد، یا سرور
  // هنوز ۴۰۱ می‌دهد): به ورود، نه صفحه‌ی سفید. `protectedLoader` فقط هنگامِ
  // ناوبری اجرا می‌شود، پس این حالت را خودِ layout باید بگیرد.
  const sessionRejected =
    !isAuthenticated || (sessionFailed && sessionError?.response?.status === 401);

  if (sessionRejected) {
    if (isAuthenticated) logout();
    const from = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`${ROUTES.LOGIN}?from=${from}`} replace />;
  }

  // هر خطای دیگر (سرور در دسترس نیست، ۵۰۰): کاربر خارج نمی‌شود، ولی باید
  // بداند چه شده و بتواند دوباره تلاش کند.
  if (sessionFailed) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
        <WifiOff className="size-10 text-muted-foreground" />
        <div className="space-y-1">
          <p className="font-bold">ارتباط با سرور برقرار نشد</p>
          <p className="text-sm text-muted-foreground">
            {/* بدونِ response یعنی سرور اصلاً جواب نداده؛ پیامِ axios انگلیسی است. */}
            {(sessionError?.response && sessionError.message) ||
              "لطفاً اتصال اینترنت را بررسی کنید و دوباره تلاش کنید."}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => retrySession()} disabled={sessionRetrying}>
            {sessionRetrying ? "در حال تلاش..." : "تلاش دوباره"}
          </Button>
          <Button variant="outline" onClick={logout}>
            ورود دوباره
          </Button>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar side="right" />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-4 border-b px-4">
            <div className=" ml-auto flex items-center gap-2 ">
              <SidebarTrigger className="-mr-1 ml-auto " />
              <ThemeToggle />
              <div className="flex flex-1 items-center gap-4">
                {showBack && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={onBack ?? goBack}
                  >
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                )}
                {title && (
                  <h1 className="hidden sm:block md:text-xl font-bold tracking-tight">{title}</h1>
                )}
              </div>
            </div>
            <AppBreadcrumb />
          </header>
          <div className="relative flex min-h-[calc(100svh-4rem)] p-4">
            <RouteLoadingOverlay contained />
            <Suspense fallback={<ContentSpinner />}>
              <PermissionGate>
                <Outlet />
              </PermissionGate>
            </Suspense>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
