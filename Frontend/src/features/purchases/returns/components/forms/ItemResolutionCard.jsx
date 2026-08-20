import { useState } from "react";
import { CheckCircle2, Link2 } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import ResolutionLineRow from "./ResolutionLineRow";
import UnknownItemProductLinkDialog from "./UnknownItemProductLinkDialog";
import AddResolutionForm from "@/shared/components/forms/AddResolutionForm";
import {
  amountResolutionTypeForClaim,
  isSurplusClaim,
  requiresProductLink,
  resolutionLabelsForClaim,
} from "../../domain/purchaseReturnRules";
import {
  PURCHASE_RETURN_REASON_LABELS,
  PURCHASE_RETURN_REASON_STYLES,
} from "../../services/mockData";

export default function ItemResolutionCard({
  item,
  onAddResolution,
  onRemoveResolution,
  isBusy,
  readOnly,
}) {
  const resolutions = item.resolutions || [];
  const allocated = resolutions.reduce((s, r) => s + (Number(r.qty) || 0), 0);
  const remaining = item.qty - allocated;

  // تصمیمی که کاربر ثبت کرده ولی هنوز نمی‌شود اجرایش کرد، چون این قلم
  // کالای ثبت‌نشده است و برای نگهداری باید اول به یک کالای واقعی وصل
  // شود.
  const [pendingResolution, setPendingResolution] = useState(null);

  const handleAdd = (resolution) => {
    if (requiresProductLink(item, resolution.type)) {
      setPendingResolution(resolution);
      return;
    }
    onAddResolution(item.issueId, resolution);
  };

  const handleLinkConfirmed = (link) => {
    onAddResolution(item.issueId, { ...pendingResolution, ...link });
    setPendingResolution(null);
  };

  return (
    <div className="border border-border rounded-lg p-3 space-y-2.5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <p className="font-medium text-card-foreground text-sm truncate">
              {item.productName}
            </p>
            {/* روی کارت تصمیم، نوع ادعا باید بی‌واسطه دیده شود: پنج
                کارت پشت‌سرهم که بعضی کسری‌اند و بعضی مازاد، بدون این
                بج از هم قابل تشخیص نیستند. */}
            {isSurplusClaim(item) && (
              <Badge
                variant="outline"
                className={`text-[10px] shrink-0 ${PURCHASE_RETURN_REASON_STYLES[item.reason] ?? ""}`}
              >
                {PURCHASE_RETURN_REASON_LABELS[item.reason] ?? item.reason}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {item.productCode}
            {item.linkedProductName && (
              <span className="inline-flex items-center gap-1 mr-1.5 text-[oklch(0.50_0.16_152)]">
                <Link2 className="h-3 w-3" />
                {item.linkedProductName}
              </span>
            )}
          </p>
        </div>
        <span className="text-xs text-muted-foreground tabular-nums shrink-0">
          {allocated.toLocaleString("fa-IR")} از {item.qty.toLocaleString("fa-IR")} تخصیص یافته
        </span>
      </div>

      {resolutions.length > 0 && (
        <div className="space-y-1.5">
          {resolutions.map((res) => (
            <ResolutionLineRow
              key={res.id}
              resolution={res}
              isBusy={isBusy}
              onRemove={
                !readOnly && onRemoveResolution
                  ? () => onRemoveResolution(item.issueId, res.id)
                  : null
              }
            />
          ))}
        </div>
      )}

      {/* گزینه‌های تصمیم به نوع ادعای همین قلم بستگی دارد: یک قلم
          کسری هرگز «عودت کالا» پیشنهاد نمی‌گیرد و یک قلم مازاد هرگز
          «ارسال کالای جایگزین». */}
      {!readOnly && remaining > 0 && (
        <AddResolutionForm
          item={item}
          remaining={remaining}
          isBusy={isBusy}
          typeLabels={resolutionLabelsForClaim(item)}
          refundType={amountResolutionTypeForClaim(item)}
          onAdd={handleAdd}
        />
      )}

      {remaining === 0 && (
        <p className="text-xs text-[oklch(0.50_0.16_152)] flex items-center gap-1">
          <CheckCircle2 className="h-3.5 w-3.5" />
          این قلم به‌طور کامل تخصیص یافته
        </p>
      )}

      {pendingResolution && (
        <UnknownItemProductLinkDialog
          open
          onOpenChange={(next) => {
            if (!next) setPendingResolution(null);
          }}
          item={item}
          pendingResolution={pendingResolution}
          onConfirm={handleLinkConfirmed}
          isBusy={isBusy}
        />
      )}
    </div>
  );
}
