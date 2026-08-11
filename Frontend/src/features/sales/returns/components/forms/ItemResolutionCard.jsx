import { CheckCircle2 } from "lucide-react";
import ResolutionLineRow from "./ResolutionLineRow";
import AddResolutionForm from "./AddResolutionForm";
import ClaimsSummary from "./ClaimsSummary";
import InspectionSummary from "./InspectionSummary";

/**
 * تصمیم‌گیری برای یک قلم مرجوعی فروش.
 * سقف تخصیص، مقدارِ تأییدشده توسط انبار است (نه مقدار ادعای مشتری).
 */
export default function ItemResolutionCard({
  item,
  onAddResolution,
  onRemoveResolution,
  isBusy,
  readOnly,
}) {
  const resolutions = item.resolutions || [];
  const verifiedQty = item.verifiedQty ?? 0;
  const allocated = resolutions.reduce((s, r) => s + (Number(r.qty) || 0), 0);
  const remaining = verifiedQty - allocated;

  return (
    <div className="border border-border rounded-lg p-3 space-y-2.5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium text-card-foreground text-sm truncate">
            {item.productName}
          </p>
          <p className="text-xs text-muted-foreground">{item.productCode}</p>
        </div>
        <span className="text-xs text-muted-foreground tabular-nums shrink-0">
          {allocated.toLocaleString("fa-IR")} از{" "}
          {verifiedQty.toLocaleString("fa-IR")} تخصیص یافته
        </span>
      </div>

      <ClaimsSummary item={item} />
      <InspectionSummary item={item} />

      {resolutions.length > 0 && (
        <div className="space-y-1.5">
          {resolutions.map((res) => (
            <ResolutionLineRow
              key={res.id}
              resolution={res}
              isBusy={isBusy}
              onRemove={
                !readOnly && onRemoveResolution
                  ? () => onRemoveResolution(item.lineId, res.id)
                  : null
              }
            />
          ))}
        </div>
      )}

      {!readOnly && remaining > 0 && (
        <AddResolutionForm
          item={item}
          remaining={remaining}
          isBusy={isBusy}
          onAdd={(resolution) => onAddResolution(item.lineId, resolution)}
        />
      )}

      {remaining === 0 && verifiedQty > 0 && (
        <p className="text-xs text-[oklch(0.50_0.16_152)] flex items-center gap-1">
          <CheckCircle2 className="h-3.5 w-3.5" />
          این قلم به‌طور کامل تخصیص یافته
        </p>
      )}
    </div>
  );
}
