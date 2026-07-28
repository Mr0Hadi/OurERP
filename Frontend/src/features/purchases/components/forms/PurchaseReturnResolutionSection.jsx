// src/features/purchases/components/forms/PurchaseReturnResolutionSection.jsx
import { useState } from "react";
import {
  Clock,
  MessageCircle,
  Undo2,
  PackageCheck,
  XCircle,
  Ban,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Label } from "@/shared/components/ui/label";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  PURCHASE_RETURN_STATUSES,
  PURCHASE_RETURN_STATUS_LABELS,
  RESOLUTION_TYPES,
  RESOLUTION_TYPE_LABELS,
} from "../../services/returns/mockData";

const STATUS_CONFIG = {
  [PURCHASE_RETURN_STATUSES.PENDING]: {
    icon: Clock,
    className:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-400",
  },
  [PURCHASE_RETURN_STATUSES.COORDINATING]: {
    icon: MessageCircle,
    className:
      "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-400",
  },
  [PURCHASE_RETURN_STATUSES.AWAITING_REFUND]: {
    icon: Undo2,
    className:
      "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:border-purple-800 dark:text-purple-400",
  },
  [PURCHASE_RETURN_STATUSES.AWAITING_REPLACEMENT]: {
    icon: PackageCheck,
    className:
      "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:border-orange-800 dark:text-orange-400",
  },
  [PURCHASE_RETURN_STATUSES.RESOLVED]: {
    icon: CheckCircle2,
    className:
      "bg-green-50 text-[oklch(0.50_0.16_152)] border-green-200 dark:bg-green-950/40 dark:border-green-800",
  },
  [PURCHASE_RETURN_STATUSES.REJECTED]: {
    icon: XCircle,
    className: "bg-destructive/5 text-destructive border-destructive/20",
  },
  [PURCHASE_RETURN_STATUSES.CANCELLED]: {
    icon: Ban,
    className: "bg-muted text-muted-foreground border-border",
  },
};

export default function PurchaseReturnResolutionSection({
  formData,
  totalAmount,
  onUpdateStatus,
  isBusy,
}) {
  const [resolutionType, setResolutionType] = useState(
    formData.resolutionType || RESOLUTION_TYPES.NONE,
  );
  const [refundAmount, setRefundAmount] = useState(formData.refundAmount || "");
  const [note, setNote] = useState(formData.supplierResponseNote || "");

  const status = formData.status;
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG[PURCHASE_RETURN_STATUSES.PENDING];
  const StatusIcon = config.icon;
  const isFinal = [
    PURCHASE_RETURN_STATUSES.RESOLVED,
    PURCHASE_RETURN_STATUSES.CANCELLED,
  ].includes(status);

  const commit = (extra) =>
    onUpdateStatus({
      resolutionType,
      refundAmount: Number(refundAmount) || 0,
      supplierResponseNote: note,
      ...extra,
    });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-card-foreground">
          پیگیری و هماهنگی با تامین‌کننده
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">وضعیت فعلی</span>
          <Badge variant="outline" className={`gap-1.5 ${config.className}`}>
            <StatusIcon className="h-3.5 w-3.5" />
            {PURCHASE_RETURN_STATUS_LABELS[status] ?? status}
          </Badge>
        </div>

        <div className="flex items-center justify-between text-sm border-t border-border pt-3">
          <span className="text-muted-foreground">جمع مبلغ مرجوعی</span>
          <span className="font-medium text-card-foreground">
            {totalAmount.toLocaleString("fa-IR")} ریال
          </span>
        </div>

        {!isFinal && (
          <>
            <div className="space-y-1.5 border-t border-border pt-3">
              <Label className="text-sm font-medium text-card-foreground">نحوه تسویه</Label>
              <Select value={resolutionType} onValueChange={setResolutionType}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(RESOLUTION_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {resolutionType === RESOLUTION_TYPES.REFUND && (
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-card-foreground">
                  مبلغ بازگشتی (ریال)
                </Label>
                <Input
                  type="number"
                  dir="ltr"
                  min={0}
                  placeholder={totalAmount.toString()}
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  className="h-9 input-rtl-placeholder"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-card-foreground">
                یادداشت هماهنگی با تامین‌کننده
              </Label>
              <Textarea
                placeholder="نتیجه تماس، توافق انجام‌شده و ..."
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="resize-none text-sm"
              />
            </div>
          </>
        )}

        <div className="flex flex-col gap-2 border-t border-border pt-3">
          {status === PURCHASE_RETURN_STATUSES.PENDING && (
            <>
              <Button
                type="button"
                className="w-full gap-2"
                disabled={isBusy}
                onClick={() => commit({ status: PURCHASE_RETURN_STATUSES.COORDINATING })}
              >
                <MessageCircle className="h-4 w-4" />
                شروع هماهنگی با تامین‌کننده
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2 text-muted-foreground"
                disabled={isBusy}
                onClick={() => commit({ status: PURCHASE_RETURN_STATUSES.CANCELLED })}
              >
                <Ban className="h-4 w-4" />
                لغو مرجوعی
              </Button>
            </>
          )}

          {status === PURCHASE_RETURN_STATUSES.COORDINATING && (
            <>
              <Button
                type="button"
                className="w-full gap-2"
                disabled={isBusy || resolutionType === RESOLUTION_TYPES.NONE}
                onClick={() => {
                  const nextStatus =
                    resolutionType === RESOLUTION_TYPES.REFUND
                      ? PURCHASE_RETURN_STATUSES.AWAITING_REFUND
                      : resolutionType === RESOLUTION_TYPES.REPLACEMENT
                      ? PURCHASE_RETURN_STATUSES.AWAITING_REPLACEMENT
                      : PURCHASE_RETURN_STATUSES.RESOLVED;
                  commit({ status: nextStatus });
                }}
              >
                <CheckCircle2 className="h-4 w-4" />
                ثبت نتیجه هماهنگی
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2 border-destructive/30 text-destructive hover:bg-destructive/10"
                disabled={isBusy}
                onClick={() =>
                  commit({
                    status: PURCHASE_RETURN_STATUSES.REJECTED,
                    resolutionType: RESOLUTION_TYPES.NONE,
                  })
                }
              >
                <XCircle className="h-4 w-4" />
                رد شد توسط تامین‌کننده
              </Button>
            </>
          )}

          {status === PURCHASE_RETURN_STATUSES.REJECTED && (
            <>
              <Button
                type="button"
                className="w-full gap-2"
                disabled={isBusy}
                onClick={() => commit({ status: PURCHASE_RETURN_STATUSES.COORDINATING })}
              >
                <MessageCircle className="h-4 w-4" />
                بازگشایی و تلاش مجدد هماهنگی
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2 text-muted-foreground"
                disabled={isBusy}
                onClick={() =>
                  commit({
                    status: PURCHASE_RETURN_STATUSES.RESOLVED,
                    resolutionType: RESOLUTION_TYPES.WRITE_OFF,
                    refundAmount: 0,
                  })
                }
              >
                <Ban className="h-4 w-4" />
                پذیرش زیان و بستن نهایی
              </Button>
            </>
          )}

          {status === PURCHASE_RETURN_STATUSES.AWAITING_REFUND && (
            <Button
              type="button"
              className="w-full gap-2"
              disabled={isBusy}
              onClick={() => commit({ status: PURCHASE_RETURN_STATUSES.RESOLVED })}
            >
              <Undo2 className="h-4 w-4" />
              تأیید دریافت وجه بازگشتی
            </Button>
          )}

          {status === PURCHASE_RETURN_STATUSES.AWAITING_REPLACEMENT && (
            <>
              <Button
                type="button"
                className="w-full gap-2"
                disabled={isBusy}
                onClick={() => commit({ status: PURCHASE_RETURN_STATUSES.RESOLVED })}
              >
                <PackageCheck className="h-4 w-4" />
                تأیید دریافت کالای جایگزین
              </Button>
              <p className="text-xs text-muted-foreground">
                پس از رسیدن محموله جایگزین، تحویل آن توسط انباردار از صفحه «دریافت کالا» بررسی می‌شود.
              </p>
            </>
          )}

          {isFinal && status === PURCHASE_RETURN_STATUSES.RESOLVED && (
            <div className="text-sm space-y-1 border-t border-border pt-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">نحوه تسویه</span>
                <span className="font-medium text-card-foreground">
                  {RESOLUTION_TYPE_LABELS[formData.resolutionType] ?? "-"}
                </span>
              </div>
              {formData.resolutionType === RESOLUTION_TYPES.REFUND && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">مبلغ بازگشتی</span>
                  <span className="font-medium text-card-foreground">
                    {(formData.refundAmount || 0).toLocaleString("fa-IR")} ریال
                  </span>
                </div>
              )}
            </div>
          )}

          {isFinal && (
            <p className="text-xs text-muted-foreground text-center">
              این مرجوعی بسته شده و قابل تغییر نیست.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}