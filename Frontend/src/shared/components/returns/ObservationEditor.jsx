import { Plus, X } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  OBSERVATION_PROBLEMS,
  OBSERVATION_PROBLEM_LABELS,
  DEFAULT_OBSERVATION_PROBLEM,
} from "@/shared/domain/returns/observations";

const PROBLEM_OPTIONS = Object.values(OBSERVATION_PROBLEMS);

/**
 * `Observations` یک خطِ دورِ کالا — مشاهده‌ی خودِ انباردار هنگامِ
 * تحویل‌گرفتنِ کالای برگشتی: چند تا از آنچه رسید معیوب یا آسیب‌دیده بود.
 *
 * باقیمانده یعنی سالم؛ بکند `HealthyQuantity` را از `Quantity` منهای
 * مجموعِ همین مشاهده‌ها حساب می‌کند و فقط همان بخش به موجودیِ
 * قابل‌فروش برمی‌گردد. به همین دلیل مجموعِ مشاهده‌ها هرگز از مقدارِ
 * همین دور بیشتر نمی‌شود.
 */
export default function ObservationEditor({
  round,
  onAddObservation,
  onUpdateObservation,
  onRemoveObservation,
  title,
  emptyHint = "اگر بخشی از کالای برگشتی معیوب یا آسیب‌دیده است، اینجا ثبتش کنید. باقیمانده سالم فرض می‌شود و به موجودی قابل‌فروش برمی‌گردد.",
  healthySuffix = "عدد سالم به موجودی برمی‌گردد",
  addLabel = "افزودن مشاهده",
}) {
  const observations = round.observations || [];
  const allocated = observations.reduce(
    (sum, observation) => sum + (Number(observation.quantity) || 0),
    0,
  );
  const remaining = round.quantity - allocated;

  return (
    <div className="space-y-2 rounded-lg border border-dashed border-amber-300 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-950/10 p-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-card-foreground">
          {title ??
            `بازرسی کالای برگشتی (${round.quantity.toLocaleString("fa-IR")} عدد دریافت‌شده)`}
        </span>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 text-xs gap-1"
          onClick={() =>
            onAddObservation(round.effectId, DEFAULT_OBSERVATION_PROBLEM)
          }
          disabled={remaining <= 0}
        >
          <Plus className="h-3 w-3" />
          {addLabel}
        </Button>
      </div>

      {observations.length === 0 && (
        <p className="text-xs text-muted-foreground">{emptyHint}</p>
      )}

      {observations.map((observation) => (
        <div
          key={observation.id}
          className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 bg-card rounded-md border border-border p-1.5"
        >
          {/* problem از فضای عددیِ RETURN_PROBLEMS می‌آید؛ Radix رشته
              می‌خواهد و رشته برمی‌گرداند. */}
          <Select
            value={observation.problem == null ? "" : String(observation.problem)}
            onValueChange={(v) =>
              onUpdateObservation(
                round.effectId,
                observation.id,
                "problem",
                Number(v),
              )
            }
          >
            <SelectTrigger className="h-8 text-xs sm:w-36 shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROBLEM_OPTIONS.map((value) => (
                <SelectItem key={value} value={String(value)}>
                  {OBSERVATION_PROBLEM_LABELS[value] ?? value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            type="number"
            min={0}
            value={observation.quantity}
            onChange={(e) =>
              onUpdateObservation(
                round.effectId,
                observation.id,
                "quantity",
                e.target.value,
              )
            }
            className="h-8 text-center text-xs sm:w-16 shrink-0"
          />

          <Input
            placeholder="یادداشت (اختیاری)..."
            value={observation.note || ""}
            onChange={(e) =>
              onUpdateObservation(
                round.effectId,
                observation.id,
                "note",
                e.target.value,
              )
            }
            className="h-8 text-xs flex-1"
          />

          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
            onClick={() => onRemoveObservation(round.effectId, observation.id)}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}

      {observations.length > 0 && (
        <p className="text-[11px] text-muted-foreground">
          مشکل‌دار: {allocated.toLocaleString("fa-IR")} از{" "}
          {round.quantity.toLocaleString("fa-IR")}
          {remaining > 0 && (
            <>
              {" "}
              — {remaining.toLocaleString("fa-IR")} {healthySuffix}
            </>
          )}
        </p>
      )}
    </div>
  );
}
