import { Suspense } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { ArrowRight } from "lucide-react";

import { TooltipProvider } from "@/shared/components/ui/tooltip";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/shared/components/ui/sidebar";
import { Button } from "@/shared/components/ui/button";
import { Spinner } from "@/shared/components/ui/spinner";
import { AppSidebar } from "./AppSidebar";
import { AppBreadcrumb } from "./AppBreadcrumb";
import RouteLoadingOverlay from "@/shared/components/layout/RouteLoadingOverlay";
import { ThemeToggle } from "@/shared/components/theme/ThemeToggle";
import { useHeaderStore } from "@/shared/store/headerStore";
import { useGoBack } from "@/shared/hooks/useGoBack";
import { useHideOnScroll } from "@/shared/hooks/useHideOnScroll";
import { ROUTES } from "@/shared/constants/routes";
import { useAuthStore } from "@/features/auth/store/authStore";
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
  const setActionsSlot = useHeaderStore((s) => s.setActionsSlot);
  // پیش‌فرضِ دکمه‌ی برگشت، صفحه‌ی قبلی است. صفحه‌ها فقط وقتی onBack
  // می‌دهند که پیش از رفتن کاری داشته باشند (مثلاً پاک‌کردن فرم).
  const goBack = useGoBack();
  const isHeaderHidden = useHideOnScroll();

  const location = useLocation();

  // ورود به این layout فقط با نشستِ تأییدشده ممکن است (`protectedLoader`).
  // اگر بعداً خارج شد (خروج در تبِ دیگر، رفرشِ ناموفق در interceptor)، به ورود.
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  // ۴۰۳ِ «تغییرِ رمزِ اجباری» وسطِ کار (interceptorِ axios پرچم را می‌گذارد).
  const mustChangePassword = useAuthStore((s) => s.mustChangePassword);

  if (!isAuthenticated || mustChangePassword) {
    const from = encodeURIComponent(location.pathname + location.search);
    const target = isAuthenticated ? ROUTES.CHANGE_PASSWORD : ROUTES.LOGIN;
    return <Navigate to={`${target}?from=${from}`} replace />;
  }

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar side="right" />
        {/* `--app-header-offset` ارتفاعِ پیدای هدر است تا چیزهای sticky زیرش بچسبند، نه پشتش. */}
        <SidebarInset style={{ "--app-header-offset": isHeaderHidden ? "0px" : "4rem" }}>
          {/* هدر مثلِ نوارِ کروم: با اسکرول به پایین کنار می‌رود و با اسکرول به بالا برمی‌گردد. */}
          <header
            className={`sticky top-0 z-30 flex h-16 shrink-0 items-center gap-4 border-b bg-background px-4 transition-transform duration-200 ${
              isHeaderHidden ? "-translate-y-full" : ""
            }`}
          >
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
                {/* دکمه‌های صفحه (`PageHeaderActions`) */}
                <div ref={setActionsSlot} className="flex items-center gap-2 empty:hidden" />
              </div>
            </div>
            <AppBreadcrumb />
          </header>
          {/* `*:min-w-0`: صفحه آیتمِ فلکس است و بدونِ آن جدولِ عریض (مثلاً گردش حساب) کلِ صفحه را روی موبایل پهن می‌کرد. */}
          <div className="relative flex min-h-[calc(100svh-4rem)] p-4 *:min-w-0">
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
