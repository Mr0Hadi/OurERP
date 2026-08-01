// src/features/sales/components/forms/SalesReturnResolutionSection.jsx
import {
  Clock, MessageCircle, Wallet, PackageCheck, Gift, Ban,
  CheckCircle2, XCircle, RotateCcw, Trash2, Plus, ClipboardList,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/shared/components/ui/select";
import {
  SALES_RETURN_STATUSES,
  SALES_RETURN_STATUS_LABELS,
  RESOLUTION_TYPES,
  RESOLUTION_TYPE_LABELS,
  RESOLUTION_LINE_STATUSES,
  SALES_RETURN_REASON_LABELS,
  RETURN_ISSUE_TYPE_LABELS,
  RETURN_ISSUE_TYPE_STYLES,
} from "../../services/returns/mockData";

const STATUS_CONFIG = {
  [SALES_RETURN_STATUSES.PENDING_INSPECTION]: {
    icon: Clock,
    className: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-400",
  },
  [SALES_RETURN_STATUSES.COORDINATING]: {
    icon: MessageCircle,
    className: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-400",
  },
  [SALES_RETURN_STATUSES.RESOLVED]: {
    icon: CheckCircle2,
    className: "bg-green-50 text-[oklch(0.50_0.16_152)] border-green-200 dark:bg-green-950/40 dark:border-green-800",
  },
  [SALES_RETURN_STATUSES.REJECTED]: { icon: XCircle, className: "bg-destructive/5 text-destructive border-destructive/20" },
  [SALES_RETURN_STATUSES.CANCELLED]: { icon: Ban, className: "bg-muted text-muted-foreground border-border" },
};

const RESOLUTION_TYPE_CONFIG = {
  [RESOLUTION_TYPES.REFUND]: {
    icon: Wallet,
    className: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:border-purple-800 dark:text-purple-400",
  },
  [RESOLUTION_TYPES.REPLACEMENT]: {
    icon: PackageCheck,
    className: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:border-orange-800 dark:text-orange-400",
  },
  [RESOLUTION_TYPES.STORE_CREDIT]: {
    icon: Gift,
    className: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:border-sky-800 dark:text-sky-400",
  },
  [RESOLUTION_TYPES.NO_COMPENSATION]: { icon: Ban, className: "bg-muted text-muted-foreground border-border" },
};

function ResolutionLineRow({ resolution, onRemove, isBusy }) {
  const config = RESOLUTION_TYPE_CONFIG[resolution.type];
  const Icon = config.icon;
  const isAwaiting = resolution.status === RESOLUTION_LINE_STATUSES.AWAITING;
  const isReplacement = resolution.type === RESOLUTION_TYPES.REPLACEMENT;
  const shippedQty = resolution.shippedQty || 0;

  return (
    <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-card px-2.5 py-2">
      <div className="flex items-center gap-2 min-w-0">
        <Badge variant="outline" className={`gap-1 text-[11px] shrink-0 ${config.className}`}>
          <Icon className="h-3 w-3" />
          {RESOLUTION_TYPE_LABELS[resolution.type]}
        </Badge>
        <span className="text-xs font-medium text-card-foreground tabular-nums shrink-0">
          {resolution.qty.toLocaleString("fa-IR")} عدد
        </span>
        {resolution.type === RESOLUTION_TYPES.REFUND && (
          <span className="text-xs text-muted-foreground tabular-nums shrink-0">
            ({resolution.refundAmount.toLocaleString("fa-IR")} ریال)
          </span>
        )}
        {resolution.note && <span className="text-xs text-muted-foreground truncate">{resolution.note}</span>}
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {isAwaiting ? (
          isReplacement ? (
            <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-400">
              {shippedQty > 0
                ? `${shippedQty.toLocaleString("fa-IR")} از ${resolution.qty.toLocaleString("fa-IR")} ارسال شده — در صف ارسال انبار`
                : "در صف ارسال انبار"}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
              در انتظار
            </Badge>
          )
        ) : (
          <Badge variant="outline" className="text-[10px] bg-green-50 text-[oklch(0.50_0.16_152)] border-green-200 dark:bg-green-950/40 dark:border-green-800">
            نهایی شد
          </Badge>
        )}
        {isAwaiting && shippedQty === 0 && onRemove && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-destructive"
            onClick={onRemove}
            disabled={isBusy}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

function AddResolutionForm({ item, remaining, onAdd, isBusy }) {
  const [type, setType] = useState(RESOLUTION_TYPES.REFUND);
  const [qty, setQty] = useState(remaining);
  const [refundAmount, setRefundAmount] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => { setQty(remaining); }, [remaining]);

  const handleSubmit = () => {
    const numQty = Number(qty);
    if (!numQty || numQty <= 0) return;
    onAdd({
      type,
      qty: numQty,
      refundAmount: type === RESOLUTION_TYPES.REFUND ? Number(refundAmount) || numQty * item.unitPrice : 0,
      note,
    });
    setNote("");
    setRefundAmount("");
  };

  return (
    <div className="rounded-lg border border-dashed border-primary/30 bg-primary/[0.03] p-2.5 space-y-2">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="h-8 text-xs col-span-2 sm:col-span-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(RESOLUTION_TYPE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          type="number" min={1} max={remaining} value={qty}
          onChange={(e) => setQty(e.target.value)}
          placeholder="تعداد"
          className="h-8 text-xs text-center"
        />

        {type === RESOLUTION_TYPES.REFUND ? (
          <Input
            type="number" dir="ltr" min={0} value={refundAmount}
            onChange={(e) => setRefundAmount(e.target.value)}
            placeholder={(Number(qty) * item.unitPrice || 0).toLocaleString("fa-IR")}
            className="h-8 text-xs col-span-2 sm:col-span-1"
          />
        ) : (
          <div className="hidden sm:block" />
        )}

        <Input
          value={note} onChange={(e) => setNote(e.target.value)}
          placeholder="یادداشت (اختیاری)..."
          className="h-8 text-xs col-span-2 sm:col-span-1"
        />
      </div>
      <Button type="button" size="sm" className="w-full gap-1.5 h-8 text-xs" onClick={handleSubmit} disabled={isBusy || !qty || Number(qty) <= 0}>
        <Plus className="h-3.5 w-3.5" />
        ثبت این تصمیم برای {Number(qty || 0).toLocaleString("fa-IR")} عدد
      </Button>
    </div>
  );
}

function ClaimsSummary({ item }) {
  const claims = item.claims || [];
  if (claims.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {claims.map((claim) => (
        <Badge key={claim.id} variant="outline" className="text-[10px] gap-1">
          {SALES_RETURN_REASON_LABELS[claim.reason] ?? claim.reason}: {(Number(claim.qty) || 0).toLocaleString("fa-IR")}
        </Badge>
      ))}
    </div>
  );
}

function InspectionSummary({ item }) {
  const issues = item.issues || [];
  const problemQty = issues.reduce((s, i) => s + (Number(i.qty) || 0), 0);
  const sellableQty = Math.max(0, (item.verifiedQty || 0) - problemQty);
  const missingQty = Math.max(0, item.claimedQty - (item.verifiedQty || 0));

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {sellableQty > 0 && (
        <Badge variant="outline" className="text-[10px] gap-1 bg-green-50 text-[oklch(0.50_0.16_152)] border-green-200 dark:bg-green-950/40 dark:border-green-800">
          سالم: {sellableQty.toLocaleString("fa-IR")}
        </Badge>
      )}
      {issues.map((issue) => (
        <Badge key={issue.id} variant="outline" className={`text-[10px] gap-1 ${RETURN_ISSUE_TYPE_STYLES[issue.issueType] ?? ""}`}>
          {RETURN_ISSUE_TYPE_LABELS[issue.issueType] ?? issue.issueType}: {(Number(issue.qty) || 0).toLocaleString("fa-IR")}
        </Badge>
      ))}
      {missingQty > 0 && (
        <Badge variant="outline" className="text-[10px] gap-1 bg-destructive/5 text-destructive border-destructive/20">
          هنوز نرسیده: {missingQty.toLocaleString("fa-IR")}
        </Badge>
      )}
    </div>
  );
}

function ItemResolutionCard({ item, onAddResolution, onRemoveResolution, isBusy, readOnly }) {
  const resolutions = item.resolutions || [];
  const verifiedQty = item.verifiedQty ?? 0;
  const allocated = resolutions.reduce((s, r) => s + (Number(r.qty) || 0), 0);
  const remaining = verifiedQty - allocated;

  return (
    <div className="border border-border rounded-lg p-3 space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium text-card-foreground text-sm truncate">{item.productName}</p>
          <p className="text-xs text-muted-foreground">{item.productCode}</p>
        </div>
        <span className="text-xs text-muted-foreground tabular-nums shrink-0">
          {allocated.toLocaleString("fa-IR")} از {verifiedQty.toLocaleString("fa-IR")} تخصیص یافته
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
              onRemove={!readOnly && onRemoveResolution ? () => onRemoveResolution(item.lineId, res.id) : null}
            />
          ))}
        </div>
      )}

      {!readOnly && remaining > 0 && (
        <AddResolutionForm item={item} remaining={remaining} isBusy={isBusy} onAdd={(resolution) => onAddResolution(item.lineId, resolution)} />
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

export default function SalesReturnResolutionSection({
  salesReturn,
  onAddResolution,
  onRemoveResolution,
  onReject,
  onCancel,
  onReopen,
  isBusy,
}) {
  const status = salesReturn.status;
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG[SALES_RETURN_STATUSES.PENDING_INSPECTION];
  const StatusIcon = config.icon;
  const items = salesReturn.items || [];

  const totalVerifiedQty = items.reduce((s, i) => s + (i.verifiedQty || 0), 0);
  const allLines = items.flatMap((i) => i.resolutions || []);
  const allocatedQty = allLines.reduce((s, l) => s + (Number(l.qty) || 0), 0);
  const resolvedQty = allLines
    .filter((l) => l.status === RESOLUTION_LINE_STATUSES.RESOLVED)
    .reduce((s, l) => s + (Number(l.qty) || 0), 0);

  const isReadOnly = [SALES_RETURN_STATUSES.RESOLVED, SALES_RETURN_STATUSES.CANCELLED, SALES_RETURN_STATUSES.REJECTED].includes(status);
  const hasAnyVerified = items.some((i) => (i.verifiedQty || 0) > 0);
  const stillAwaitingMore = items.some((i) => (i.verifiedQty || 0) < i.claimedQty);
  const canRejectOrCancel = status === SALES_RETURN_STATUSES.PENDING_INSPECTION && !hasAnyVerified;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-card-foreground">تصمیم‌گیری برای مشتری</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">وضعیت فعلی</span>
          <Badge variant="outline" className={`gap-1.5 ${config.className}`}>
            <StatusIcon className="h-3.5 w-3.5" />
            {SALES_RETURN_STATUS_LABELS[status] ?? status}
          </Badge>
        </div>

        {status === SALES_RETURN_STATUSES.PENDING_INSPECTION && stillAwaitingMore && salesReturn.transporterName && (
          <div className="flex items-start gap-2 rounded-lg bg-muted/50 border border-border px-2.5 py-2 text-xs">
            <ClipboardList className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
            <span className="text-muted-foreground">
              تا اینجا از <span className="text-card-foreground font-medium">{salesReturn.transporterName}</span> دریافت
              شده؛ بخش دیگری از این مرجوعی هنوز نرسیده و باید هر وقت رسید از صفحه‌ی «انبار ← دریافت کالا» ثبت شود.
            </span>
          </div>
        )}

        {totalVerifiedQty > 0 && (
          <div className="space-y-1.5 border-t border-border pt-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>پیشرفت تسویه‌ی بخش رسیده</span>
              <span className="tabular-nums font-medium text-card-foreground">
                {resolvedQty.toLocaleString("fa-IR")} / {totalVerifiedQty.toLocaleString("fa-IR")} عدد نهایی شده
                {allocatedQty > resolvedQty && (
                  <span className="text-amber-600 dark:text-amber-400"> (+{(allocatedQty - resolvedQty).toLocaleString("fa-IR")} در صف ارسال انبار)</span>
                )}
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-[oklch(0.50_0.16_152)] transition-all" style={{ width: `${totalVerifiedQty > 0 ? (resolvedQty / totalVerifiedQty) * 100 : 0}%` }} />
            </div>
          </div>
        )}

        {status === SALES_RETURN_STATUSES.PENDING_INSPECTION && !hasAnyVerified && (
          <p className="text-sm text-muted-foreground border-t border-border pt-3">
            تصمیم‌گیری برای این مرجوعی، پس از ثبت نتیجه‌ی بررسی فیزیکی توسط انبار (از صفحه‌ی «انبار ← دریافت کالا») فعال
            می‌شود.
          </p>
        )}

        {status === SALES_RETURN_STATUSES.REJECTED && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 space-y-2">
            <p className="text-sm text-muted-foreground">این درخواست رد شده است. اگر لازم است دوباره بررسی شود، آن را بازگشایی کنید.</p>
            <Button type="button" className="w-full gap-2" disabled={isBusy} onClick={onReopen}>
              <RotateCcw className="h-4 w-4" />
              بازگشایی و ارسال به بررسی انبار
            </Button>
          </div>
        )}

        {status === SALES_RETURN_STATUSES.CANCELLED && (
          <p className="text-sm text-muted-foreground">این درخواست لغو شده است.</p>
        )}

        {!isReadOnly && hasAnyVerified && (
          <div className="space-y-3 border-t border-border pt-3">
            {items.filter((i) => (i.verifiedQty || 0) > 0).map((item) => (
              <ItemResolutionCard
                key={item.lineId}
                item={item}
                onAddResolution={onAddResolution}
                onRemoveResolution={onRemoveResolution}
                isBusy={isBusy}
                readOnly={false}
              />
            ))}
          </div>
        )}

        {isReadOnly && status !== SALES_RETURN_STATUSES.CANCELLED && status !== SALES_RETURN_STATUSES.REJECTED && items.length > 0 && (
          <div className="space-y-3 border-t border-border pt-3">
            {items.map((item) => (
              <ItemResolutionCard key={item.lineId} item={item} isBusy={isBusy} readOnly />
            ))}
          </div>
        )}

        {canRejectOrCancel && (
          <div className="flex gap-2 border-t border-border pt-3">
            <Button type="button" variant="outline" className="flex-1 gap-2 border-destructive/30 text-destructive hover:bg-destructive/10" disabled={isBusy} onClick={onReject}>
              <XCircle className="h-4 w-4" />
              رد ادعای مشتری
            </Button>
            <Button type="button" variant="outline" className="gap-2 text-muted-foreground" disabled={isBusy} onClick={onCancel}>
              <Ban className="h-4 w-4" />
              لغو درخواست
            </Button>
          </div>
        )}

        {status === SALES_RETURN_STATUSES.RESOLVED && (
          <p className="text-xs text-muted-foreground text-center border-t border-border pt-3">
            این مرجوعی به‌طور کامل تسویه شده و قابل تغییر نیست.
          </p>
        )}
      </CardContent>
    </Card>
  );
}