import { FileQuestion } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/shared/components/ui/button";
import { ROUTES } from "@/shared/constants/routes";

/** «صفحه پیدا نشد» — فقط برای مسیری که وجود ندارد؛ خطاهای رندر/loader با `RouteErrorPage`اند. */
export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="m-auto flex min-h-[60svh] max-w-md flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
        <FileQuestion className="h-7 w-7 text-muted-foreground" />
      </div>
      <h2 className="text-lg font-bold">صفحه پیدا نشد</h2>
      <p className="text-sm leading-6 text-muted-foreground">
        آدرسی که باز کرده‌اید وجود ندارد یا جابه‌جا شده است.
      </p>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => navigate(-1)}>
          بازگشت
        </Button>
        <Button onClick={() => navigate(ROUTES.DASHBOARD)}>رفتن به داشبورد</Button>
      </div>
    </div>
  );
}
