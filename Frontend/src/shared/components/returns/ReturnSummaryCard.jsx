import { useMemo } from "react";
import { Undo2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { Badge } from "@/shared/components/ui/badge";
import { Progress } from "@/shared/components/ui/progress";
import PersianDatePicker from "@/shared/components/ui/persian-date-picker";
import { gregorianToPersian } from "@/shared/utils/dateUtils";
import { RETURN_STATUS_STYLES } from "@/shared/domain/returns/statuses";

/**
 * قرینه‌ی ReceivingSummaryCard / ShippingSummaryCard برای صفحاتی که سندشان
 * یک خرید یا فروش نیست، خودِ مرجوعی است — دریافت کالای برگشتی از مشتری،
 * و عودت کالا به تامین‌کننده.
 *
 * چرا کارت جدا؟ چون آن دو کارت به وضعیتِ خرید/فروش (PURCHASE_STATUSES /
 * SALE_STATUSES) و برچسبِ «تأمین‌کننده»/«شماره فاکتور» قفل‌اند. اینجا
 * وضعیت، وضعیتِ مرجوعی است (side.statusLabels) و طرف حساب و شماره سند
 * را هم صفحه‌ی صدازننده با توجه به side مشخص می‌کند.
 */
export default function ReturnSummaryCard({
  side,
  formData,
  onFormChange,
  partyName,
  title,
  progressLabel,
  progressField,
  dateField,
  dateLabel,
  noteField,
  noteLabel,
}) {
  const handleChange = (field, value) => onFormChange({ [field]: value });

  const stats = useMemo(() => {
    const items = formData.items || [];
    const expected = items.reduce((sum, i) => sum + (i.expectedQty || 0), 0);
    const done = items.reduce(
      (sum, i) => sum + (Number(i[progressField]) || 0),
      0,
    );
    const percent = expected > 0 ? Math.round((done / expected) * 100) : 0;
    return { expected, done, percent };
  }, [formData.items, progressField]);

  const statusStyle = RETURN_STATUS_STYLES[formData.status] ?? "";
  const statusLabel = side.statusLabels[formData.status] ?? formData.status;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">وضعیت مرجوعی</span>
          <Badge variant="secondary" className={`gap-1.5 ${statusStyle}`}>
            <Undo2 className="h-3.5 w-3.5" />
            {statusLabel}
          </Badge>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{progressLabel}</span>
            <span className="tabular-nums font-medium text-card-foreground">
              {stats.done.toLocaleString("fa-IR")} /{" "}
              {stats.expected.toLocaleString("fa-IR")} (
              {stats.percent.toLocaleString("fa-IR")}٪)
            </span>
          </div>
          <Progress value={stats.percent} className="h-2" />
        </div>

        <div className="grid grid-cols-1 gap-2 text-sm border-t border-border pt-3">
          <div>
            <Label className="text-xs text-muted-foreground">
              {side.counterparty}
            </Label>
            <p className="font-medium">{partyName}</p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">شماره مرجوعی</Label>
            <p className="font-medium">{formData.invoiceNumber}</p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">
              تاریخ ثبت مرجوعی
            </Label>
            <p className="font-medium">
              {gregorianToPersian(formData.invoiceDate)}
            </p>
          </div>
        </div>

        <div className="space-y-2 border-t border-border pt-3">
          <Label className="text-sm font-medium">{dateLabel}</Label>
          <PersianDatePicker
            value={formData[dateField]}
            onChange={(isoDate) => handleChange(dateField, isoDate)}
            placeholder="مثال: ۱۴۰۵/۰۵/۰۲"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">{noteLabel}</Label>
          <Textarea
            placeholder="توضیحات کلی..."
            value={formData[noteField] || ""}
            onChange={(e) => handleChange(noteField, e.target.value)}
            rows={3}
            className="resize-none text-sm"
          />
        </div>
      </CardContent>
    </Card>
  );
}
