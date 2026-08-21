import { useMemo } from "react";
import { Undo2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { Badge } from "@/shared/components/ui/badge";
import { Progress } from "@/shared/components/ui/progress";
import PersianDatePicker from "@/shared/components/ui/persian-date-picker";
import {
  SALES_RETURN_STATUS_LABELS,
  SALES_RETURN_STATUS_STYLES,
} from "@/features/sales/returns/domain/returnVocabulary";

export default function ReturnSummaryCard({ formData, onFormChange }) {
  const handleChange = (field, value) => onFormChange({ [field]: value });

  // پیشرفت این مرجوعی در پس‌گرفتن کالا: آنچه در دورهای قبل تحویل شده،
  // به‌علاوه‌ی آنچه همین حالا در فرم وارد شده، نسبت به کل مقداری که
  // تصمیم گرفته شده پس گرفته شود.
  const stats = useMemo(() => {
    const lines = formData.lines || [];
    let total = 0;
    let received = 0;
    lines.forEach((line) => {
      total += (Number(line.qty) || 0);
      received += (Number(line.doneQty) || 0) + (Number(line.qtyThisRound) || 0);
    });
    const percent = total > 0 ? Math.round((received / total) * 100) : 0;
    return { total, received, percent };
  }, [formData.lines]);

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
          <Badge
            variant="outline"
            className={SALES_RETURN_STATUS_STYLES[formData.status] ?? ""}
          >
            {SALES_RETURN_STATUS_LABELS[formData.status] ?? formData.status}
          </Badge>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>پیشرفت پس‌گرفتن کالا (همه‌ی دورها)</span>
            <span className="tabular-nums font-medium text-card-foreground">
              {stats.received.toLocaleString("fa-IR")} / {stats.total.toLocaleString("fa-IR")} ({stats.percent.toLocaleString("fa-IR")}٪)
            </span>
          </div>
          <Progress value={stats.percent} className="h-2" />
        </div>

        <div className="grid grid-cols-1 gap-2 text-sm border-t border-border pt-3">
          <div><Label className="text-xs text-muted-foreground">مشتری</Label><p className="font-medium">{formData.customerName}</p></div>
          <div><Label className="text-xs text-muted-foreground">شماره مرجوعی</Label><p className="font-medium">{formData.returnNumber}</p></div>
          <div><Label className="text-xs text-muted-foreground">فاکتور فروش</Label><p className="font-medium">{formData.saleInvoiceNumber}</p></div>
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