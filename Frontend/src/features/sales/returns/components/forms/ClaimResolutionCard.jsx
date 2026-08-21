import { useState } from "react";
import { CheckCircle2, Plus, X } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
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
  CLAIM_SCOPES,
} from "../../domain/returnVocabulary";

/**
 * تصمیم‌گیری برای یک ادعا.
 *
 * فرمِ ثبت تصمیم بسته است و فقط با دکمه باز می‌شود. قبلاً برای هر ادعا
 * هم‌زمان باز بود و صفحه‌ی یک مرجوعیِ سه‌قلمی، سه فرمِ کاملِ چک‌باکس‌دار
 * و انتخابگرِ کالا را با هم نشان می‌داد — نه روی دسکتاپ خواندنی بود و
 * نه روی موبایل قابل استفاده.
 */
export default function ClaimResolutionCard({
  claim,
  onAddResolution,
  onRemoveResolution,
  isBusy,
  readOnly,
}) {
  const [isComposerOpen, setIsComposerOpen] = useState(false);

  const resolutions = claim.resolutions || [];
  const decided = claimDecidedQty(claim);
  const remaining = claimRemainingQty(claim);
  const total = Number(claim.qty) || 0;
  const isOffInvoice = claim.scope === CLAIM_SCOPES.OFF_INVOICE;
  const canDecide = !readOnly && remaining > 0;

  return (
    <div className="border border-border rounded-lg p-3 space-y-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium text-card-foreground text-sm break-words">
            {claim.productName}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {claim.productCode}
          </p>
        </div>
        <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">
          {decided.toLocaleString("fa-IR")} / {total.toLocaleString("fa-IR")}
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
          <Badge variant="outline" className="text-[10px]">
            {OFF_INVOICE_KIND_LABELS[claim.offInvoiceKind] ?? "خارج از فاکتور"}
          </Badge>
        )}
        {claim.note && (
          <span className="text-[11px] text-muted-foreground break-words">
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

      {canDecide &&
        (isComposerOpen ? (
          <div className="space-y-2">
            <ResolutionComposer
              claim={claim}
              remaining={remaining}
              isBusy={isBusy}
              onAdd={(composition) => {
                onAddResolution(claim.id, composition);
                setIsComposerOpen(false);
              }}
            />
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="w-full h-7 text-[11px] gap-1 text-muted-foreground"
              onClick={() => setIsComposerOpen(false)}
            >
              <X className="h-3.5 w-3.5" />
              بستن
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="w-full h-8 text-xs gap-1.5"
            onClick={() => setIsComposerOpen(true)}
            disabled={isBusy}
          >
            <Plus className="h-3.5 w-3.5" />
            ثبت تصمیم برای {remaining.toLocaleString("fa-IR")} عدد باقیمانده
          </Button>
        ))}

      {remaining === 0 && (
        <p className="text-[11px] text-[oklch(0.50_0.16_152)] flex items-center gap-1">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          برای کل این ادعا تصمیم گرفته شده
        </p>
      )}
    </div>
  );
}
