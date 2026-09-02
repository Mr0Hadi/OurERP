// src/features/reports/pages/ReportsHomePage.jsx
import { Link } from "react-router-dom";
import { BarChart3, Building2, UserCog, Users } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
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
    icon: Building2,
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
    <div className="container mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>گزارش‌ها</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {REPORTS.map((report) => (
              <Link
                key={report.to}
                to={report.to}
                className="flex items-start gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:bg-muted/50"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <report.icon className="size-4" />
                </span>
                <span className="min-w-0 space-y-1">
                  <span className="block truncate text-sm font-medium">
                    {report.title}
                  </span>
                  <span className="block text-xs leading-relaxed text-muted-foreground">
                    {report.description}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
