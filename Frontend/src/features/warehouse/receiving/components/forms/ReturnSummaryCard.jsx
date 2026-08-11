import { useMemo } from "react";
import { Clock, MessageCircle, Undo2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { Badge } from "@/shared/components/ui/badge";
import { Progress } from "@/shared/components/ui/progress";
import PersianDatePicker from "@/shared/components/ui/persian-date-picker";
import {
  SALES_RETURN_STATUSES, SALES_RETURN_STATUS_LABELS, SALES_RETURN_REASON_LABELS,
} from "@/features/sales/returns/services/mockData";

const STATUS_CONFIG = {
  [SALES_RETURN_STATUSES.PENDING_INSPECTION]: { icon: Clock, textColor: "text-amber-600 dark:text-amber-400" },
  [SALES_RETURN_STATUSES.COORDINATING]: { icon: MessageCircle, textColor: "text-blue-600 dark:text-blue-400" },
};
const DEFAULT_STATUS_CONFIG = { icon: Clock, textColor: "text-card-foreground" };

export default function ReturnSummaryCard({ salesReturn, formData, onFormChange }) {
  const handleChange = (field, value) => onFormChange({ [field]: value });

  // پیشرفت کلی: قبلاً چقدر (در دورهای پیشین) + این دور، نسبت به کل ادعاشده
  const stats = useMemo(() => {
    const originalItems = salesReturn.items || [];
    const draftByLine = new Map((formData.items || []).map((i) => [i.lineId, i]));

    let claimed = 0;
    let verified = 0;
    originalItems.forEach((item) => {
      claimed += item.claimedQty;
      const draft = draftByLine.get(item.lineId);
      verified += (item.verifiedQty || 0) + (draft?.verifiedQtyThisRound || 0);
    });

    const percent = claimed > 0 ? Math.round((verified / claimed) * 100) : 0;
    return { claimed, verified, percent };
  }, [salesReturn.items, formData.items]);

  const config = STATUS_CONFIG[formData.status] ?? DEFAULT_STATUS_CONFIG;
  const StatusIcon = config.icon;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center justify-between">
          <span>اطلاعات دریافت</span>
          <Badge variant="secondary" className="gap-1.5 text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40">
            <Undo2 className="h-3.5 w-3.5" />مرجوعی فروش
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">وضعیت مرجوعی</span>
          <Badge variant="secondary" className={`gap-1.5 ${config.textColor}`}>
            <StatusIcon className="h-3.5 w-3.5" />
            {SALES_RETURN_STATUS_LABELS[formData.status] ?? formData.status}
          </Badge>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>پیشرفت کلی دریافت (همه‌ی دورها)</span>
            <span className="tabular-nums font-medium text-card-foreground">
              {stats.verified.toLocaleString("fa-IR")} / {stats.claimed.toLocaleString("fa-IR")} ({stats.percent.toLocaleString("fa-IR")}٪)
            </span>
          </div>
          <Progress value={stats.percent} className="h-2" />
        </div>

        <div className="grid grid-cols-1 gap-2 text-sm border-t border-border pt-3">
          <div><Label className="text-xs text-muted-foreground">مشتری</Label><p className="font-medium">{formData.customerName}</p></div>
          <div><Label className="text-xs text-muted-foreground">شماره مرجوعی</Label><p className="font-medium">{formData.returnNumber}</p></div>
          <div><Label className="text-xs text-muted-foreground">فاکتور فروش</Label><p className="font-medium">{formData.saleInvoiceNumber}</p></div>
          <div><Label className="text-xs text-muted-foreground">دلیل اصلی ادعا</Label><p className="font-medium">{SALES_RETURN_REASON_LABELS[formData.reason] ?? formData.reason}</p></div>
        </div>

        <div className="space-y-2 border-t border-border pt-3">
          <Label className="text-sm font-medium">تاریخ این دورِ دریافت</Label>
          <PersianDatePicker value={formData.receivedDate} onChange={(isoDate) => handleChange("receivedDate", isoDate)} placeholder="مثال: ۱۴۰۵/۰۵/۰۲" />
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">یادداشت این دور</Label>
          <Textarea placeholder="توضیحات کلی..." value={formData.receivingNote || ""} onChange={(e) => handleChange("receivingNote", e.target.value)} rows={3} className="resize-none text-sm" />
        </div>
      </CardContent>
    </Card>
  );
}