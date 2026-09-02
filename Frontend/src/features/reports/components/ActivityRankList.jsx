// src/features/reports/components/ActivityRankList.jsx
import { Inbox } from "lucide-react";

import DataTablePagination from "@/shared/components/table/DataTablePagination";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { formatNumber, formatPercent } from "@/shared/components/charts/chartUtils";
import { cn } from "@/shared/lib/utils";

/**
 * رتبه‌بندیِ گزارش‌های فعالیت — به‌جای جدول، فهرستِ نواری.
 *
 * چرا جدول نشد: خروجیِ این چهار endpoint همیشه «چند ردیفِ رتبه‌بندی‌شده
 * بر اساس مبلغ» است، نه داده‌ی چندبعدی. جدولِ چهارستونه روی موبایل یا
 * افقی اسکرول می‌شد یا ستون‌ها را له می‌کرد، و مهم‌تر اینکه *نسبتِ*
 * ردیف‌ها به هم — همان چیزی که کاربر در یک گزارشِ رتبه‌بندی دنبالش است —
 * از چهار عددِ کنارِ هم خوانده نمی‌شد. این‌جا هر ردیف یک نوار دارد و
 * ترتیب و اندازه با یک نگاه دیده می‌شود.
 *
 * دو حالتِ نوار:
 *  - گزارش‌های کارمندان: سهمِ ردیف نسبت به **صدرنشین**.
 *  - گزارش‌های مشتری/تامین‌کننده: نسبتِ **پرداخت‌شده به کل**، چون
 *    `totalPaidAmount` هم می‌آید و «چقدر مانده» سوالِ اصلیِ آن دو صفحه است.
 *
 * صفحه‌بندی همان `DataTablePagination`ِ مشترک است تا رفتار و ظاهرش با
 * بقیه‌ی فهرست‌های برنامه یکی بماند.
 */

const RANK_STYLES = [
  "bg-amber-400/15 text-amber-600 dark:text-amber-400 ring-1 ring-amber-400/30",
  "bg-slate-400/15 text-slate-600 dark:text-slate-300 ring-1 ring-slate-400/30",
  "bg-orange-500/12 text-orange-600 dark:text-orange-400 ring-1 ring-orange-500/25",
];

function RankBadge({ rank }) {
  return (
    <span
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-lg text-xs font-semibold tabular-nums",
        RANK_STYLES[rank - 1] ?? "bg-muted text-muted-foreground",
      )}
    >
      {formatNumber(rank)}
    </span>
  );
}

function LoadingRows() {
  return (
    <ul className="space-y-2">
      {Array.from({ length: 5 }).map((_, index) => (
        <li key={index} className="rounded-xl border border-border bg-card p-3">
          <div className="flex items-center gap-3">
            <Skeleton className="size-7 rounded-lg" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="ms-auto h-4 w-24" />
          </div>
          <Skeleton className="mt-2.5 h-1.5 w-full" />
        </li>
      ))}
    </ul>
  );
}

export default function ActivityRankList({
  items,
  isLoading,
  totalPages,
  currentPage,
  pageSize,
  onPaginationChange,
  nameKey = "fullName",
  countKey,
  countUnit,
  showPayment = false,
  emptyMessage,
}) {
  if (isLoading) return <LoadingRows />;

  if (!items.length) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-4 py-10 text-center">
        <Inbox className="size-5 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        <p className="text-xs text-muted-foreground">
          بازه‌ی دیگری را امتحان کنید یا «همه» را انتخاب کنید.
        </p>
      </div>
    );
  }

  // مبنای نوارِ سهم، صدرنشینِ *همین صفحه* است. صفحه‌ی دوم دوباره از
  // ردیف اولش مقیاس نمی‌گیرد چون آن ردیف کوچک‌تر از صدرنشینِ صفحه‌ی
  // اول است و نوارِ پرِ گمراه‌کننده می‌ساخت.
  const leader = Math.max(...items.map((row) => Number(row.totalInvoiceAmount) || 0), 0);

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {items.map((row, index) => {
          const rank = currentPage * pageSize + index + 1;
          const amount = Number(row.totalInvoiceAmount) || 0;
          const paid = Number(row.totalPaidAmount) || 0;
          const remaining = Math.max(amount - paid, 0);

          const ratio = showPayment
            ? amount > 0
              ? paid / amount
              : 0
            : leader > 0
              ? amount / leader
              : 0;

          const settled = showPayment && remaining === 0 && amount > 0;

          return (
            <li
              key={row.userId ?? row.customerId ?? row.supplierId ?? rank}
              className="rounded-xl border border-border bg-card p-3 transition-colors hover:bg-muted/40"
            >
              <div className="flex items-start gap-3">
                <RankBadge rank={rank} />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium" title={row[nameKey]}>
                    {row[nameKey] || "—"}
                  </p>
                  {/* یک خط و نه بیشتر: با شکستنِ خط، ارتفاعِ ردیف‌ها
                      نامساوی می‌شد و فهرست ناهموار به نظر می‌رسید. */}
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {`${formatNumber(row[countKey] ?? 0)} ${countUnit}`}
                    {showPayment && (
                      <>
                        {" · "}
                        <span className={cn(settled && "text-emerald-600 dark:text-emerald-400")}>
                          {settled
                            ? "تسویه کامل"
                            : `مانده ${formatNumber(remaining)} ریال`}
                        </span>
                      </>
                    )}
                  </p>
                </div>

                <div className="shrink-0 text-end">
                  <p className="text-sm font-semibold tabular-nums sm:text-base">
                    {formatNumber(amount)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {showPayment
                      ? `${formatPercent(ratio * 100)} پرداخت‌شده`
                      : "ریال"}
                  </p>
                </div>
              </div>

              <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    showPayment
                      ? settled
                        ? "bg-emerald-500"
                        : ratio > 0
                          ? "bg-amber-400"
                          : "bg-destructive/60"
                      : "bg-primary",
                  )}
                  style={{ width: `${Math.min(100, Math.round(ratio * 100))}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>

      <DataTablePagination
        totalPages={totalPages}
        currentPage={currentPage}
        pageSize={pageSize}
        onPaginationChange={onPaginationChange}
      />
    </div>
  );
}
