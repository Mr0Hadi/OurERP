// src/features/warehouse/units/components/UnitLabelsSummary.jsx
import { Boxes, Tags, Printer } from "lucide-react";

import { Skeleton } from "@/shared/components/ui/skeleton";

/**
 * نوار خلاصه: «آیا اصلاً کاری هست؟» باید بدون خواندن جدول جواب بگیرد.
 */
function SummaryTile({ icon: Icon, label, value, tone = "default", isLoading }) {
  const tones = {
    default: "bg-card border-border text-foreground",
    attention:
      "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-300",
  };

  return (
    <div
      className={`flex items-center gap-3 rounded-xl border p-3 sm:p-4 ${tones[tone]}`}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-background/60">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        {isLoading ? (
          <Skeleton className="h-6 w-12" />
        ) : (
          <div className="text-xl font-semibold tabular-nums leading-tight">
            {value}
          </div>
        )}
        <div className="text-xs text-muted-foreground truncate">{label}</div>
      </div>
    </div>
  );
}

export default function UnitLabelsSummary({ summary, isLoading }) {
  const missing = summary?.missingLabels ?? 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <SummaryTile
        icon={Boxes}
        label="کالای نیازمند برچسب"
        value={summary?.productsNeedingLabels ?? 0}
        tone={summary?.productsNeedingLabels ? "attention" : "default"}
        isLoading={isLoading}
      />
      <SummaryTile
        icon={Tags}
        label="برچسب ساخته‌نشده"
        value={missing}
        tone={missing ? "attention" : "default"}
        isLoading={isLoading}
      />
      <SummaryTile
        icon={Printer}
        label="چاپ‌شده در امروز"
        value={summary?.printedToday ?? 0}
        isLoading={isLoading}
      />
    </div>
  );
}
