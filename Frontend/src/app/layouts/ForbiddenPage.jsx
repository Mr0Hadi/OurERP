import { ShieldX } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/shared/components/ui/button";
import { ROUTES } from "@/shared/constants/routes";

/**
 * «دسترسی ندارید» — جدا از لاگین و جدا از ۴۰۴.
 *
 * کاربر واردشده است، پس به صفحه‌ی ورود فرستاده نمی‌شود؛ مسیر هم وجود
 * دارد، پس «پیدا نشد» دروغ است.
 */
export default function ForbiddenPage() {
  const navigate = useNavigate();

  return (
    <div className="m-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10">
        <ShieldX className="h-7 w-7 text-destructive" />
      </div>
      <h2 className="text-lg font-bold">دسترسی ندارید</h2>
      <p className="text-sm leading-6 text-muted-foreground">
        شما دسترسی لازم برای مشاهده‌ی این صفحه را ندارید. اگر فکر می‌کنید
        باید داشته باشید، با مدیر سیستم تماس بگیرید.
      </p>
      <Button variant="outline" onClick={() => navigate(ROUTES.DASHBOARD)}>
        بازگشت به داشبورد
      </Button>
    </div>
  );
}
