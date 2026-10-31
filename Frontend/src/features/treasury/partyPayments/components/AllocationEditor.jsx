import { Wand2 } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { PriceInput } from "@/shared/components/ui/price-input";
import StatusBadge from "@/shared/components/status/StatusBadge";
import { gregorianToPersian } from "@/shared/lib/dateUtils";
import { formatDigits, formatNumber } from "@/shared/lib/numberFormat";
import { toneText } from "@/shared/lib/tone";
import { cn } from "@/shared/lib/utils";
import { allocatedTotal, autoAllocate, documentKey } from "../domain/partyPayment";

/**
 * تقسیمِ یک دریافت/پرداختِ علی‌الحساب بینِ فاکتورهای بازِ همان شخص (`GetAllocatableDocumentList`): هر فاکتور مبلغِ
 * خودش (تا مانده‌اش)، «پرکردنِ خودکار» قدیمی‌ترین سررسید اول. کنترل‌شده؛ قواعد در `domain/partyPayment.js`.
 *
 * @param documents فاکتورهای قابلِ تخصیص
 * @param draft     `{ [documentKey]: amount }`
 * @param available سقفِ جمع (مبلغِ پرداخت یا تخصیص‌نیافته‌اش)
 * @param errors    خروجیِ `allocationErrors`
 */
export default function AllocationEditor({ documents, draft, onChange, available, errors, isLoading }) {
  if (isLoading) return <Skeleton className="h-24 w-full" />;
  if (documents.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border py-4 text-center text-xs text-muted-foreground">
        فاکتورِ بازی برای تخصیص نیست؛ مبلغ روی حسابِ شخص می‌ماند.
      </p>
    );
  }

  const total = allocatedTotal(draft);
  const left = (Number(available) || 0) - total;
  const set = (doc, amount) => onChange({ ...draft, [documentKey(doc)]: amount ?? 0 });

  return (
    <div className="@container/alloc space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={() => onChange(autoAllocate(documents, available))}
          disabled={!(Number(available) > 0)}
        >
          <Wand2 className="size-3.5" />
          پرکردنِ خودکار
        </Button>
        <p className="text-xs tabular-nums text-muted-foreground">
          تخصیص {formatNumber(total)} از {formatNumber(available)}
          {left !== 0 && (
            <span className={cn("ms-2", toneText(left > 0 ? "info" : "danger"))}>
              {left > 0 ? `${formatNumber(left)} روی حساب می‌ماند` : `${formatNumber(-left)} بیشتر`}
            </span>
          )}
        </p>
      </div>

      <ul className="divide-y divide-border rounded-lg border border-border">
        {documents.map((doc) => {
          const key = documentKey(doc);
          const error = errors?.rows?.[key];
          return (
            <li key={key} className="grid gap-2 px-3 py-2 text-sm @md/alloc:grid-cols-[1fr_11rem] @md/alloc:items-center">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-1.5">
                  <span className="font-mono text-xs">
                    {doc.invoiceNumber || `#${formatDigits(doc.saleId ?? doc.purchaseId)}`}
                  </span>
                  {doc.isProforma && <StatusBadge tone="warning" size="sm">پیش‌فاکتور</StatusBadge>}
                </p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {[
                    doc.invoiceDate && gregorianToPersian(doc.invoiceDate),
                    doc.paymentDate && `سررسید ${gregorianToPersian(doc.paymentDate)}`,
                    `مانده ${formatNumber(doc.remainingAmount)}`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                {doc.isProforma && (
                  <p className="text-[11px] text-muted-foreground">تخصیص به پیش‌فاکتور یعنی پرداختش: فاکتور صادر می‌شود.</p>
                )}
              </div>
              <div className="space-y-1">
                <PriceInput
                  min={0}
                  value={Number(draft[key]) || null}
                  onValueChange={(amount) => set(doc, amount)}
                  placeholder="۰"
                  aria-label={`مبلغِ تخصیص به ${doc.invoiceNumber || "فاکتور"}`}
                  aria-invalid={Boolean(error)}
                  className="h-9 tabular-nums"
                />
                {error && <p className="text-[11px] text-destructive">{error}</p>}
              </div>
            </li>
          );
        })}
      </ul>
      {errors?.total && <p className="text-xs text-destructive">{errors.total}</p>}
    </div>
  );
}
