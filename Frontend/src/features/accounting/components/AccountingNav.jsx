import { useEffect, useRef } from "react";
import { NavLink } from "react-router-dom";

import { cn } from "@/shared/lib/utils";
import { ACCOUNTING_PAGES } from "../domain/accountingPages";

/**
 * نوارِ صفحه‌های حسابداری بالای هر صفحه — جابه‌جاییِ یک‌کلیکی بینِ داشبورد و دفترها، بدونِ
 * بازکردنِ منوی کناری (که روی موبایل یک Sheet است).
 *
 * یک ردیفِ افقی‌اسکرول (نه `flex-wrap`) تا ارتفاعش ثابت بماند؛ صفحه‌ی فعال هنگامِ ورود در
 * دید قرار می‌گیرد، وگرنه روی موبایل «ارزش موجودی» بیرونِ کادر می‌ماند و کاربر نمی‌دانست کجاست.
 */
export default function AccountingNav() {
  const activeRef = useRef(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest", inline: "center" });
  }, []);

  return (
    <nav aria-label="صفحه‌های حسابداری" className="-mx-1 overflow-x-auto px-1 scrollbar-hide">
      <div className="flex w-max gap-1 rounded-xl border border-border bg-card p-1">
        {ACCOUNTING_PAGES.map((page) => (
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
      </div>
    </nav>
  );
}
