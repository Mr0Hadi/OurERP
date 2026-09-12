import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { Input } from "@/shared/components/ui/input";
import { Badge } from "@/shared/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import ProductThumb from "@/shared/components/forms/ProductThumb";
import QuantityStepper from "@/shared/components/forms/QuantityStepper";
import { createRowStatus } from "@/shared/lib/createRowStatus";
import ObservationEditor from "./ObservationEditor";

const { getRowStatus, ROW_STATUS_CONFIG } = createRowStatus({
  completeLabel: "کامل",
  partialLabel: "ناقص",
  emptyKey: "missing",
  emptyLabel: "انجام نشده",
});

/**
 * اقلامِ یک دورِ کالا روی یک مرجوعی — هر ردیف یک *اثر* است، نه یک کالا:
 * یک کالا می‌تواند در چند ادعا و چند تصمیم ظاهر شود و هرکدام اثرِ
 * جداگانه‌ی خودش را دارد.
 *
 * `withObservations` فقط برای اثرِ ورودی روشن می‌شود؛ در اثرِ خروجی
 * چیزی برای بازرسی وجود ندارد — کالا از انبارِ خودمان می‌رود.
 */
export default function GoodsRoundItemsSection({
  rounds,
  title,
  subtitle,
  withObservations = false,
  onQuantityChange,
  onAddObservation,
  onUpdateObservation,
  onRemoveObservation,
}) {
  const [search, setSearch] = useState("");

  const filteredRounds = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rounds;
    return rounds.filter(
      (round) =>
        round.productName?.toLowerCase().includes(term) ||
        round.productCode?.toLowerCase().includes(term),
    );
  }, [rounds, search]);

  const totals = useMemo(
    () =>
      rounds.reduce(
        (acc, round) => {
          acc.remaining += round.remainingQuantity || 0;
          acc.quantity += Number(round.quantity) || 0;
          return acc;
        },
        { remaining: 0, quantity: 0 },
      ),
    [rounds],
  );

  return (
    <Card>
      <CardHeader className="flex flex-col items-start gap-2 pb-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>
        <Badge variant="outline" className="text-xs tabular-nums">
          {totals.quantity.toLocaleString("fa-IR")} از{" "}
          {totals.remaining.toLocaleString("fa-IR")}
        </Badge>
      </CardHeader>

      <CardContent className="space-y-3">
        {rounds.length > 1 && (
          <div className="relative">
            <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="جست‌وجو بر اساس نام یا کد کالا..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-8 text-sm h-9 input-rtl-placeholder"
            />
          </div>
        )}

        {rounds.length === 0 && (
          <p className="text-muted-foreground text-sm text-center py-8">
            اطلاعاتی وجود ندارد
          </p>
        )}

        {rounds.length > 0 && filteredRounds.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-6">
            کالایی با این مشخصات یافت نشد
          </p>
        )}

        {filteredRounds.map((round) => {
          const status = getRowStatus(
            round.remainingQuantity,
            Number(round.quantity) || 0,
          );
          const config = ROW_STATUS_CONFIG[status];
          const StatusIcon = config.icon;

          return (
            <div
              key={round.effectId}
              className={`rounded-lg border border-border p-3 space-y-2.5 ${config.rowClass}`}
            >
              <div className="flex items-start gap-2.5">
                <ProductThumb item={round} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-card-foreground text-sm truncate">
                    {round.productName}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground mt-0.5">
                    <span>{round.productCode}</span>
                    {round.unit && (
                      <>
                        <span className="text-border">|</span>
                        <span>{round.unit}</span>
                      </>
                    )}
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={`gap-1 text-xs shrink-0 ${config.badgeClass}`}
                >
                  <StatusIcon className="h-3 w-3" />
                  {config.label}
                </Badge>
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/60">
                <span className="text-xs text-muted-foreground">
                  باقیمانده‌ی این اثر:{" "}
                  <span className="tabular-nums font-medium text-card-foreground">
                    {round.remainingQuantity.toLocaleString("fa-IR")}
                  </span>
                </span>
                <QuantityStepper
                  value={round.quantity}
                  max={round.remainingQuantity}
                  onChange={(next) => onQuantityChange(round.effectId, next)}
                  size="sm"
                />
              </div>

              {withObservations && round.quantity > 0 && (
                <ObservationEditor
                  round={round}
                  onAddObservation={onAddObservation}
                  onUpdateObservation={onUpdateObservation}
                  onRemoveObservation={onRemoveObservation}
                />
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
