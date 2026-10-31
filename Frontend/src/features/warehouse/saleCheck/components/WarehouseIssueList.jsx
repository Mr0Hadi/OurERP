import { AlertTriangle, Plus, Trash2 } from "lucide-react";

import { UNIT_ACTION_REASON_LABELS } from "@/features/warehouse/units/domain/unitVocabulary";
import SectionCard from "@/shared/components/forms/SectionCard";
import { Button } from "@/shared/components/ui/button";

/**
 * گزارش‌های دانه‌ی معیوب/مفقودِ این بررسی (نادر). هر دانه با ثبتِ بررسی به قرنطینه و صفِ حسابداری می‌رود؛
 * انباردار دانه‌ی سالمِ دیگری را در ردیفِ همان کالا اسکن می‌کند.
 *
 * @param onAdd    بازکردنِ `WarehouseIssueDialog`
 * @param onRemove `(barcode) => void`
 */
export default function WarehouseIssueList({ issues, onAdd, onRemove }) {
  return (
    <SectionCard
      title="دانه‌ی معیوب یا مفقود"
      description="نادر است. دانه به قرنطینه و صفِ حسابداری می‌رود؛ دانه‌ی سالمِ دیگری را در ردیفِ همان کالا اسکن کنید."
      action={
        <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={onAdd}>
          <Plus className="size-4" />
          گزارش
        </Button>
      }
    >
      {issues.length === 0 ? (
        <p className="text-xs text-muted-foreground">گزارشی ثبت نشده است.</p>
      ) : (
        <ul className="space-y-2">
          {issues.map((issue) => (
            <li key={issue.productUnitBarcode} className="flex items-start gap-2 rounded-lg border p-2.5 text-sm">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
              <div className="min-w-0 flex-1 space-y-0.5">
                <p className="font-medium">
                  {issue.productName} · {UNIT_ACTION_REASON_LABELS[issue.reason]}
                </p>
                <p className="font-mono text-xs text-muted-foreground" dir="ltr">
                  {issue.productUnitBarcode}
                </p>
                <p className="text-xs leading-5 text-muted-foreground">{issue.description}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground"
                aria-label="حذفِ گزارش"
                onClick={() => onRemove(issue.productUnitBarcode)}
              >
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
