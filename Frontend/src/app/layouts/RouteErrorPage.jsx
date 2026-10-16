import { AlertTriangle, RefreshCw } from "lucide-react";
import { isRouteErrorResponse, useNavigate, useRouteError } from "react-router-dom";

import { Button } from "@/shared/components/ui/button";
import { ROUTES } from "@/shared/constants/routes";
import NotFoundPage from "./NotFoundPage";

/**
 * خطای رندر یا loader (`errorElement`ِ روتر).
 *
 * قبلاً هر خطایی `NotFoundPage` را نشان می‌داد و کاربر برای یک کرش «پیدا نشد» می‌دید.
 * پاسخِ ۴۰۴ِ روتر همان صفحه‌ی ۴۰۴ می‌ماند؛ بقیه پیامِ خطا با «بارگذاریِ دوباره» —
 * رایج‌ترینش نبودنِ chunkِ قدیمی بعد از deployِ تازه است که با reload حل می‌شود.
 */
export default function RouteErrorPage() {
  const error = useRouteError();
  const navigate = useNavigate();

  if (isRouteErrorResponse(error) && error.status === 404) return <NotFoundPage />;

  if (import.meta.env.DEV) console.error(error);

  return (
    <div className="m-auto flex min-h-[60svh] max-w-md flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10">
        <AlertTriangle className="h-7 w-7 text-destructive" />
      </div>
      <h2 className="text-lg font-bold">مشکلی پیش آمد</h2>
      <p className="text-sm leading-6 text-muted-foreground">
        نمایشِ این صفحه با خطا روبه‌رو شد. صفحه را دوباره بارگذاری کنید؛ اگر
        مشکل ماند، با پشتیبانی تماس بگیرید.
      </p>
      {import.meta.env.DEV && error?.message && (
        <pre dir="ltr" className="max-w-full overflow-x-auto rounded-md bg-muted p-3 text-start text-xs">
          {error.message}
        </pre>
      )}
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => navigate(ROUTES.DASHBOARD)}>
          رفتن به داشبورد
        </Button>
        <Button onClick={() => window.location.reload()} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          بارگذاری دوباره
        </Button>
      </div>
    </div>
  );
}
