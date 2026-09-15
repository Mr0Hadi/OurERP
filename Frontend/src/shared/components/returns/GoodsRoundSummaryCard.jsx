import { useMemo } from "react";
import { Undo2 } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { Badge } from "@/shared/components/ui/badge";
import { Progress } from "@/shared/components/ui/progress";
import PersianDatePicker from "@/shared/components/ui/persian-date-picker";
import { gregorianToPersian } from "@/shared/lib/dateUtils";
import { RETURN_STATUS_STYLES } from "@/shared/domain/returns/statuses";

/**
 * کارتِ کنارِ فرمِ یک دورِ کالا — قرینه‌ی `ReceivingSummaryCard` برای
 * صفحاتی که سندشان یک خرید/فروش نیست، خودِ مرجوعی است.
 *
 * `date` و `note` همان فیلدهای سرِ `ExecuteGoodsRoundCommand`اند، پس
 * این کارت مستقیماً روی `header`ِ هوکِ `useGoodsRoundForm` می‌نشیند.
 */
export default function GoodsRoundSummaryCard({
  side,
  returnDoc,
  partyName,
  rounds,
  header,
  onHeaderChange,
  title,
  progressLabel,
  dateLabel,
  noteLabel,
}) {
  const stats = useMemo(() => {
    const remaining = rounds.reduce(
      (sum, round) => sum + (round.remainingQuantity || 0),
      0,
    );
    const done = rounds.reduce(
      (sum, round) => sum + (Number(round.quantity) || 0),
      0,
    );
    const percent = remaining > 0 ? Math.round((done / remaining) * 100) : 0;
    return { remaining, done, percent };
  }, [rounds]);

  const statusStyle = RETURN_STATUS_STYLES[returnDoc.status] ?? "";
  const statusLabel = side.statusLabels[returnDoc.status] ?? returnDoc.status;

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
              {stats.remaining.toLocaleString("fa-IR")} (
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
            <p className="font-medium">{returnDoc.returnNumber}</p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">
              تاریخ ثبت مرجوعی
            </Label>
            <p className="font-medium">
              {gregorianToPersian(returnDoc.returnDate)}
            </p>
          </div>
        </div>

        <div className="space-y-2 border-t border-border pt-3">
          <Label className="text-sm font-medium">{dateLabel}</Label>
          <PersianDatePicker
            value={header.date}
            onChange={(isoDate) => onHeaderChange({ date: isoDate })}
            placeholder="مثال: ۱۴۰۵/۰۵/۰۲"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">{noteLabel}</Label>
          <Textarea
            placeholder="توضیحات کلی..."
            value={header.note || ""}
            onChange={(e) => onHeaderChange({ note: e.target.value })}
            rows={3}
            className="resize-none text-sm"
          />
        </div>
      </CardContent>
    </Card>
  );
}
