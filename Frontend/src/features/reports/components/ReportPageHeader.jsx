// src/features/reports/components/ReportPageHeader.jsx
import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

import { ROUTES } from "@/shared/constants/routes";

/**
 * سرصفحه‌ی مشترکِ صفحه‌های گزارش: عنوان، یک خط توضیح که *منبعِ* عدد را
 * می‌گوید، و راهِ برگشت به فهرست گزارش‌ها.
 *
 * توضیح جزئی از سرصفحه است نه یک نوشته‌ی تزئینی: این چهار گزارش شبیهِ
 * هم‌اند و بدون آن، کاربر نمی‌داند «تعداد فروش» یعنی فاکتورهایی که
 * کارمند ثبت کرده یا فاکتورهایی که به او مربوط است.
 */
export default function ReportPageHeader({ title, description, icon: Icon }) {
  return (
    <div className="flex items-start gap-3">
      {Icon && (
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <Icon className="size-5" />
        </span>
      )}

      <div className="min-w-0 flex-1 space-y-1">
        <h1 className="truncate text-lg font-semibold sm:text-xl">{title}</h1>
        <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
          {description}
        </p>
      </div>

      <Link
        to={ROUTES.REPORTS}
        className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        همه گزارش‌ها
        <ChevronLeft className="size-3.5" />
      </Link>
    </div>
  );
}
