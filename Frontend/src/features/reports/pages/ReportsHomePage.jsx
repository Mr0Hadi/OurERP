// src/features/reports/pages/ReportsHomePage.jsx
import { Link } from "react-router-dom";
import { BarChart3, ChevronLeft, Truck, UserCog, Users } from "lucide-react";

import { ROUTES } from "@/shared/constants/routes";

/**
 * فهرستِ گزارش‌های موجود.
 *
 * فقط گزارش‌هایی اینجا هستند که واقعاً پشتِ یک endpoint نشسته‌اند —
 * صفحه‌های خالیِ قدیمی (مالی، سود و زیان، انبار) عمداً لینک نشده‌اند تا
 * کاربر روی چیزی کلیک نکند که «به‌زودی» است.
 */
const REPORTS = [
  {
    title: "فعالیت کارمندان",
    description: "رتبه‌بندی کارمندان بر اساس فروش و خریدی که خودشان ثبت کرده‌اند.",
    to: ROUTES.REPORTS_EMPLOYEES,
    icon: UserCog,
  },
  {
    title: "آمار خرید مشتریان",
    description: "پرخریدترین مشتریان و مانده‌ی تسویه‌نشده‌ی هرکدام.",
    to: ROUTES.REPORTS_CUSTOMERS,
    icon: Users,
  },
  {
    title: "آمار خرید از تامین‌کنندگان",
    description: "از هر تامین‌کننده چقدر خریده‌ایم و چقدرش پرداخت شده.",
    to: ROUTES.REPORTS_SUPPLIERS,
    icon: Truck,
  },
  {
    title: "داشبورد فروش و خرید",
    description: "روند فروش، خرید و سود خالص در بازه‌های روزانه تا سالانه.",
    to: ROUTES.DASHBOARD,
    icon: BarChart3,
  },
];

export default function ReportsHomePage() {
  return (
    <div className="container mx-auto max-w-4xl space-y-4 px-2 sm:px-4">
      <div className="space-y-1">
        <h1 className="text-lg font-semibold sm:text-xl">گزارش‌ها</h1>
        <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
          گزارش‌هایی که همین حالا روی داده‌ی واقعی کار می‌کنند.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {REPORTS.map((report) => (
          <Link
            key={report.to}
            to={report.to}
            className="group flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:bg-muted/50"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors group-hover:text-foreground">
              <report.icon className="size-4.5" />
            </span>

            <span className="min-w-0 flex-1 space-y-0.5">
              <span className="block truncate text-sm font-medium">
                {report.title}
              </span>
              <span className="block text-xs leading-relaxed text-muted-foreground">
                {report.description}
              </span>
            </span>

            <ChevronLeft className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-x-0.5" />
          </Link>
        ))}
      </div>
    </div>
  );
}
