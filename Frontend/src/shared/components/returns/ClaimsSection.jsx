import { useMemo } from "react";
import { Plus } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import ClaimRow from "./ClaimRow";

function LineCard({ line, onAddClaim, onUpdateClaim, onRemoveClaim, problemLabels, deliveredLabel }) {
  const claims = line.claims || [];
  const allocated = claims.reduce((s, c) => s + (Number(c.qty) || 0), 0);
  const remaining = Math.max(0, line.maxReturnableQty - allocated);

  return (
    <div
      className={`border border-border rounded-lg p-3 space-y-2.5 ${
        allocated > 0 ? "bg-primary/[0.03]" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium text-card-foreground text-sm truncate">
            {line.productName}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {line.productCode}
          </p>
        </div>
        <div className="text-xs text-muted-foreground tabular-nums shrink-0 text-left">
          <div>
            {allocated.toLocaleString("fa-IR")} از{" "}
            {line.maxReturnableQty.toLocaleString("fa-IR")} ثبت‌شده
          </div>
          <div className="text-[11px] opacity-70">
            {deliveredLabel}: {(line.deliveredQty ?? 0).toLocaleString("fa-IR")}
          </div>
        </div>
      </div>

      {claims.length > 0 && (
        <div className="space-y-1.5">
          {claims.map((claim) => (
            <ClaimRow
              key={claim.id}
              claim={claim}
              onUpdate={(claimId, field, value) =>
                onUpdateClaim(line.lineKey, claimId, field, value)
              }
              onRemove={(claimId) => onRemoveClaim(line.lineKey, claimId)}
              problemLabels={problemLabels}
            />
          ))}
        </div>
      )}

      <Button
        type="button"
        size="sm"
        variant="outline"
        className="w-full h-8 text-xs gap-1.5"
        onClick={() => onAddClaim(line.lineKey)}
        disabled={remaining <= 0}
      >
        <Plus className="h-3.5 w-3.5" />
        {remaining > 0
          ? "افزودن مشکل برای بخشی از این کالا"
          : "کل مقدار تحویل‌شده‌ی این کالا بین مشکل‌ها تقسیم شده"}
      </Button>
    </div>
  );
}

/**
 * ثبت ادعاهای «روی فاکتور».
 *
 * هر کالا می‌تواند چند ادعای مستقل داشته باشد، چون یک محموله می‌تواند
 * هم‌زمان چند مشکل داشته باشد — مثلاً از ۱۰ عدد، ۴ عدد معیوب و ۳ عدد
 * چیزی که مشتری اشتباه سفارش داده. این دو هرگز نباید در یک ردیف جمع
 * شوند، چون تصمیمی که برایشان گرفته می‌شود فرق می‌کند.
 */
export default function ClaimsSection({
  lines,
  onAddClaim,
  onUpdateClaim,
  onRemoveClaim,
  problemLabels,
  title = "مشکلات اقلام سند",
  description,
  emptyText = "این سند قلمی برای ادعا ندارد",
  deliveredLabel = "تحویل‌شده",
}) {
  const totals = useMemo(
    () =>
      lines.reduce(
        (acc, line) => {
          const qty = (line.claims || []).reduce(
            (s, c) => s + (Number(c.qty) || 0),
            0,
          );
          acc.qty += qty;
          acc.amount += qty * line.unitPrice;
          return acc;
        },
        { qty: 0, amount: 0 },
      ),
    [lines],
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-card-foreground">
          {title}
        </CardTitle>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="space-y-2">
        {lines.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-6 border border-dashed border-border rounded-lg">
            {emptyText}
          </p>
        ) : (
          lines.map((line) => (
            <LineCard
              key={line.lineKey}
              line={line}
              onAddClaim={onAddClaim}
              onUpdateClaim={onUpdateClaim}
              onRemoveClaim={onRemoveClaim}
              problemLabels={problemLabels}
              deliveredLabel={deliveredLabel}
            />
          ))
        )}

        {totals.qty > 0 && (
          <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2.5 border border-border mt-2">
            <span className="text-sm font-medium text-muted-foreground">
              جمع ادعاهای روی سند (
              {totals.qty.toLocaleString("fa-IR")} عدد):
            </span>
            <Badge variant="outline" className="text-sm font-bold">
              {totals.amount.toLocaleString("fa-IR")} ریال
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
