import {
  Package,
  ShieldAlert,
  ShoppingCart,
  Undo2,
  Trash2,
  Tag,
} from "lucide-react";

import { Skeleton } from "@/shared/components/ui/skeleton";
import { ProductUnitStatusEnum as UNIT_STATUSES } from "@/shared/domain/enums/unitStatus";
import { UNIT_VIEWS, fa } from "../domain/unitVocabulary";

/**
 * کارت‌های بالای صفحه: «از هر کالا (یا از همه) چند دانه کجاست».
 * هر کارت میان‌بُرِ همان فهرست است — کلیک یعنی تب و فیلترِ همان کارت.
 */
const CARDS = [
  {
    key: "inStock",
    title: "در انبار",
    icon: Package,
    target: { view: UNIT_VIEWS.ALL, status: UNIT_STATUSES.IN_STOCK },
    count: (s) => s.byStatus[UNIT_STATUSES.IN_STOCK]?.count,
    tone: "text-[oklch(0.50_0.16_152)]",
  },
  {
    key: "quarantine",
    title: "قرنطینه",
    icon: ShieldAlert,
    target: { view: UNIT_VIEWS.QUARANTINE },
    count: (s) => s.byStatus[UNIT_STATUSES.QUARANTINED]?.count,
    hint: (s) => (s.quarantineValue ? `${fa(s.quarantineValue)} ریال` : null),
    tone: "text-orange-600 dark:text-orange-400",
  },
  {
    key: "unlabeled",
    title: "بدون برچسب",
    icon: Tag,
    target: { view: UNIT_VIEWS.UNLABELED },
    count: (s) => s.unprintedCount,
    tone: "text-amber-600 dark:text-amber-400",
  },
  {
    key: "sold",
    title: "نزد مشتری",
    icon: ShoppingCart,
    target: { view: UNIT_VIEWS.ALL, status: UNIT_STATUSES.SOLD },
    count: (s) => s.byStatus[UNIT_STATUSES.SOLD]?.count,
    tone: "text-sky-600 dark:text-sky-400",
  },
  {
    key: "returned",
    title: "عودت به تامین‌کننده",
    icon: Undo2,
    target: { view: UNIT_VIEWS.ALL, status: UNIT_STATUSES.RETURNED_TO_SUPPLIER },
    count: (s) => s.byStatus[UNIT_STATUSES.RETURNED_TO_SUPPLIER]?.count,
    tone: "text-muted-foreground",
  },
  {
    key: "scrapped",
    title: "اسقاط",
    icon: Trash2,
    target: { view: UNIT_VIEWS.ALL, status: UNIT_STATUSES.SCRAPPED },
    count: (s) => s.byStatus[UNIT_STATUSES.SCRAPPED]?.count,
    tone: "text-destructive",
  },
];

const isActive = (target, current) =>
  target.view === current.view &&
  (target.status == null ? current.view !== UNIT_VIEWS.ALL : target.status === current.status);

export default function UnitSummaryCards({ summary, isLoading, isError, current, onSelect }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
      {CARDS.map((card) => {
        const Icon = card.icon;
        const active = isActive(card.target, current);
        const hint = summary && card.hint?.(summary);

        return (
          <button
            key={card.key}
            type="button"
            onClick={() => onSelect(card.target)}
            aria-pressed={active}
            className={`flex flex-col items-start gap-1 rounded-xl border bg-card p-3 text-start shadow-sm transition-colors hover:bg-muted/50 ${
              active ? "border-primary ring-1 ring-primary/40" : "border-border"
            }`}
          >
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Icon className={`h-4 w-4 ${card.tone}`} />
              {card.title}
            </span>
            {isError ? (
              <span className="text-2xl font-semibold text-muted-foreground" title="شمارش خوانده نشد">
                —
              </span>
            ) : isLoading || !summary ? (
              <Skeleton className="h-7 w-14" />
            ) : (
              <span className="text-2xl font-semibold tabular-nums">
                {fa(card.count(summary))}
              </span>
            )}
            {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
          </button>
        );
      })}
    </div>
  );
}
