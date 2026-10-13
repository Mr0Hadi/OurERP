import { Fragment, useEffect, useRef } from "react";
import { NavLink } from "react-router-dom";

import { usePermission } from "@/features/auth/hooks/usePermission";
import { cn } from "@/shared/lib/utils";
import { ACCOUNTING_PAGE_GROUPS } from "../domain/accountingPages";

/**
 * نوارِ صفحه‌های «حسابداری و گزارش‌ها» بالای هر صفحه — جابه‌جاییِ یک‌کلیکی بینِ داشبورد،
 * دفترها و گزارش‌های فعالیت، بدونِ بازکردنِ منوی کناری (که روی موبایل یک Sheet است).
 *
 * فقط صفحه‌های مجاز دیده می‌شوند (`allows`: اگر فهرستِ دسترسی نیامد، همه می‌مانند و سرور
 * خودش ۴۰۳ می‌دهد). دو گروه با یک جداکننده‌ی باریک از هم جدا می‌شوند.
 *
 * یک ردیفِ افقی‌اسکرول (نه `flex-wrap`) تا ارتفاعش ثابت بماند؛ صفحه‌ی فعال هنگامِ ورود در
 * دید قرار می‌گیرد، وگرنه روی موبایل صفحه‌های انتهای نوار بیرونِ کادر می‌ماندند.
 */
export default function AccountingNav() {
  const { allows } = usePermission();
  const activeRef = useRef(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest", inline: "center" });
  }, []);

  const groups = ACCOUNTING_PAGE_GROUPS.map((group) => ({
    ...group,
    pages: group.pages.filter((page) => allows(page.permission)),
  })).filter((group) => group.pages.length > 0);

  return (
    <nav aria-label="صفحه‌های حسابداری" className="-mx-1 overflow-x-auto px-1 scrollbar-hide">
      <div className="flex w-max items-center gap-1 rounded-xl border border-border bg-card p-1">
        {groups.map((group, index) => (
          <Fragment key={group.key}>
            {index > 0 && <span aria-hidden className="mx-1 h-5 w-px shrink-0 bg-border" />}
            {group.pages.map((page) => (
              <NavLink
                key={page.to}
                to={page.to}
                end={page.end}
                ref={(node) => {
                  if (node?.getAttribute("aria-current") === "page") activeRef.current = node;
                }}
                className={({ isActive }) =>
                  cn(
                    "flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )
                }
              >
                <page.icon className="size-3.5" />
                {page.label}
              </NavLink>
            ))}
          </Fragment>
        ))}
      </div>
    </nav>
  );
}
