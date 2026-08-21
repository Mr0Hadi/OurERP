import { CheckCircle2 } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import ResolutionLineRow from "./ResolutionLineRow";
import ResolutionComposer from "./ResolutionComposer";
import {
  claimDecidedQty,
  claimRemainingQty,
} from "../../domain/returnResolutions";
import {
  RETURN_PROBLEM_LABELS,
  RETURN_PROBLEM_STYLES,
  OFF_INVOICE_KIND_LABELS,
  OFF_INVOICE_KIND_STYLES,
  CLAIM_SCOPES,
} from "../../domain/returnVocabulary";

/**
 * تصمیم‌گیری برای یک ادعا.
 *
 * سقف تخصیص، خودِ تعداد ادعاست — نه مقدارِ بازرسی‌شده. در سیستم قبلی
 * سقف به بازرسی انبار گره خورده بود و در نتیجه هیچ تصمیمی پیش از
 * تحویل‌گرفتن فیزیکی کالا ممکن نبود.
 */
export default function ClaimResolutionCard({
  claim,
  onAddResolution,
  onRemoveResolution,
  isBusy,
  readOnly,
}) {
  const resolutions = claim.resolutions || [];
  const decided = claimDecidedQty(claim);
  const remaining = claimRemainingQty(claim);
  const isOffInvoice = claim.scope === CLAIM_SCOPES.OFF_INVOICE;

  return (
    <div className="border border-border rounded-lg p-3 space-y-2.5">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium text-card-foreground text-sm truncate">
            {claim.productName}
          </p>
          <p className="text-xs text-muted-foreground">{claim.productCode}</p>
        </div>
        <span className="text-xs text-muted-foreground tabular-nums shrink-0">
          {decided.toLocaleString("fa-IR")} از{" "}
          {(Number(claim.qty) || 0).toLocaleString("fa-IR")} تصمیم‌گرفته
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <Badge
          variant="outline"
          className={`text-[10px] ${RETURN_PROBLEM_STYLES[claim.problem] ?? ""}`}
        >
          {RETURN_PROBLEM_LABELS[claim.problem] ?? claim.problem}
        </Badge>
        {isOffInvoice && (
          <Badge
            variant="outline"
            className={`text-[10px] ${
              OFF_INVOICE_KIND_STYLES[claim.offInvoiceKind] ?? ""
            }`}
          >
            {OFF_INVOICE_KIND_LABELS[claim.offInvoiceKind] ?? "خارج از فاکتور"}
          </Badge>
        )}
        {claim.note && (
          <span className="text-[11px] text-muted-foreground truncate">
            {claim.note}
          </span>
        )}
      </div>

      {resolutions.length > 0 && (
        <div className="space-y-1.5">
          {resolutions.map((resolution) => (
            <ResolutionLineRow
              key={resolution.id}
              resolution={resolution}
              isBusy={isBusy}
              onRemove={
                !readOnly && onRemoveResolution
                  ? () => onRemoveResolution(claim.id, resolution.id)
                  : null
              }
            />
          ))}
        </div>
      )}

      {!readOnly && remaining > 0 && (
        <ResolutionComposer
          claim={claim}
          remaining={remaining}
          isBusy={isBusy}
          onAdd={(draft) => onAddResolution(claim.id, draft)}
        />
      )}

      {remaining === 0 && (
        <p className="text-xs text-[oklch(0.50_0.16_152)] flex items-center gap-1">
          <CheckCircle2 className="h-3.5 w-3.5" />
          برای کل این ادعا تصمیم گرفته شده
        </p>
      )}
    </div>
  );
}
