import { Inbox } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { formatCompact, formatNumber, formatPercent } from "@/shared/components/charts/chartUtils";
import { cn } from "@/shared/lib/utils";

/**
 * سهمِ هر عضو از جمعِ تیم/واحد — نسخه‌ی فشرده‌ی `ActivityRankList`ِ
 * گزارش‌ها، بدونِ صفحه‌بندی (یک تیم در یک کارت جا می‌شود) و با نوارِ
 * *سهم از کل* به‌جای نسبت به صدرنشین: سؤالِ مسئولِ تیم «کار روی دوشِ
 * چه کسی است» است، نه «چه کسی اول شد».
 *
 * خودِ کاربر علامت می‌خورد تا جایگاهش را بدونِ خواندنِ نام‌ها پیدا کند.
 */
export default function MemberRankList({
  members,
  sides,
  currentUserId,
  isLoading,
  showTeam = false,
}) {
  if (isLoading) {
    return (
      <ul className="space-y-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <li key={index} className="space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="ms-auto h-4 w-16" />
            </div>
            <Skeleton className="h-1.5 w-full" />
          </li>
        ))}
      </ul>
    );
  }

  if (!members.length) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-4 py-8 text-center">
        <Inbox className="size-5 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          در این بازه هیچ عضوی سندی ثبت نکرده است.
        </p>
      </div>
    );
  }

  const amountKey = sides.showSales ? "saleInvoiceAmount" : "purchaseInvoiceAmount";
  const countKey = sides.showSales ? "salesCount" : "purchasesCount";
  const countUnit = sides.showSales ? "فروش" : "خرید";

  return (
    // اسکرولِ داخلی فقط برای واحدهای بزرگ؛ روی فهرستِ کوتاه یک پیکسل
    // گردکردن هم نوارِ اسکرولِ بی‌معنا می‌ساخت.
    <ul
      className={cn(
        "space-y-3",
        members.length > 6 && "max-h-80 overflow-y-auto pe-1",
      )}
    >
      {members.map((member) => {
        const isMe = member.userId === currentUserId;
        return (
          <li key={member.userId} className="space-y-1.5">
            <div className="flex items-center gap-2 text-sm">
              <span className={cn("truncate", isMe && "font-semibold")}>
                {member.fullName || "—"}
              </span>
              {isMe && (
                <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                  شما
                </Badge>
              )}
              {member.roleTitle && member.role !== 0 && (
                <span className="shrink-0 text-[11px] text-muted-foreground">
                  {member.roleTitle}
                </span>
              )}
              <span
                className="ms-auto shrink-0 font-medium tabular-nums"
                title={`${formatNumber(member[amountKey] ?? 0)} ریال`}
              >
                {formatCompact(member[amountKey] ?? 0)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn("h-full rounded-full", isMe ? "bg-primary" : "bg-primary/50")}
                  style={{ width: `${Math.min(100, Math.round(member.share))}%` }}
                />
              </div>
              <span className="w-24 shrink-0 truncate text-end text-[11px] text-muted-foreground tabular-nums">
                {formatPercent(member.share)} · {formatNumber(member[countKey] ?? 0)} {countUnit}
              </span>
            </div>
            {showTeam && member.teamName && (
              <p className="text-[11px] text-muted-foreground">{member.teamName}</p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
