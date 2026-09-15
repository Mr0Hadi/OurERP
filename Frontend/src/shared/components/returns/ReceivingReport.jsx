import { ClipboardList, ShieldAlert } from "lucide-react";

import { Badge } from "@/shared/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import RemoteImage from "@/shared/components/files/RemoteImage";
import { RETURN_PROBLEM_LABELS } from "@/shared/domain/returns/problems";
import { UNIT_CUSTODY_REASON_LABELS } from "@/shared/domain/enums/unitStatus";
import { gregorianToPersian } from "@/shared/lib/dateUtils";

const fa = (value) => (Number(value) || 0).toLocaleString("fa-IR");

const ORANGE_BADGE =
  "text-[10px] bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:border-orange-800 dark:text-orange-400";

/**
 * گزارشِ انبار برای *یک* بخشِ فرم — یک قلمِ سفارش، یا ادعای مازاد/نامرتبطِ
 * آن. همان چیزی که انباردار موقعِ دریافت دیده (خرابی‌ها، مازاد) و الان در
 * قرنطینه است، کنارِ همان جایی که واحد خرید برایش ادعا ثبت یا تصمیم
 * می‌گیرد.
 */
export function ReceivingReportLines({ quarantined = [], discrepancies = [] }) {
  const shownQuarantine = quarantined.filter((entry) => entry.quantity > 0);
  if (shownQuarantine.length === 0 && discrepancies.length === 0) return null;

  return (
    <div className="space-y-1 rounded-md border border-dashed border-orange-300 bg-orange-50/40 p-2 text-[11px] dark:border-orange-900 dark:bg-orange-950/10">
      <p className="flex items-center gap-1 font-medium text-orange-800 dark:text-orange-300">
        <ClipboardList className="h-3.5 w-3.5" />
        گزارش انبار از دریافت
      </p>
      {shownQuarantine.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {shownQuarantine.map((entry) => (
            <Badge key={entry.label} variant="outline" className={ORANGE_BADGE}>
              {entry.label}: {fa(entry.quantity)}
            </Badge>
          ))}
        </div>
      )}
      {discrepancies.length > 0 && (
        <ul className="space-y-0.5 text-muted-foreground">
          {discrepancies.map((d) => (
            <li key={d.id}>
              {gregorianToPersian(d.receivedAt)} · {fa(d.quantity)}{" "}
              {RETURN_PROBLEM_LABELS[d.problem] ?? d.problem} (
              {UNIT_CUSTODY_REASON_LABELS[d.custodyReason] ?? d.custodyReason})
              {d.note && ` — ${d.note}`}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * کارتِ کلیِ گزارشِ دریافت: عکس‌های همه‌ی دورهای دریافتِ خرید و خلاصه‌ی
 * قرنطینه — مدرکی که واحد خرید برای هماهنگی با تامین‌کننده لازم دارد.
 * گزارشِ تک‌تکِ اقلام کنارِ خودِ اقلام نشان داده می‌شود.
 */
export default function ReceivingReportCard({ receivingInfo }) {
  const images = receivingInfo?.receivingImages || [];
  const quarantinedTotal =
    (receivingInfo?.items || []).reduce(
      (sum, item) =>
        sum +
        (item.quarantinedOnOrderQuantity || 0) +
        (item.quarantinedExcessQuantity || 0),
      0,
    ) +
    (receivingInfo?.unlistedItems || []).reduce(
      (sum, item) => sum + (item.quarantinedQuantity || 0),
      0,
    );
  const discrepancyCount = (receivingInfo?.discrepancies || []).length;

  if (images.length === 0 && quarantinedTotal === 0 && discrepancyCount === 0) {
    return null;
  }

  return (
    <Card className="border-orange-200 dark:border-orange-900">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <ShieldAlert className="h-4 w-4 text-orange-600" />
          گزارش انبار از دریافت این خرید
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {fa(quarantinedTotal)} عدد در قرنطینه · {fa(discrepancyCount)} مغایرت ثبت‌شده ·{" "}
          {fa(images.length)} عکس. جزئیاتِ هر کالا کنارِ همان کالا آمده است.
        </p>
      </CardHeader>
      {images.length > 0 && (
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {images.map((image) => (
              <figure key={image.id} className="w-24 space-y-1">
                <a
                  href={image.url || undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <RemoteImage
                    imageKey={image.objectKey}
                    imageUrl={image.url}
                    alt={image.fileName || "عکس دریافت"}
                    className="h-24 w-24 rounded-md border border-border object-cover"
                  />
                </a>
                <figcaption className="text-[11px] text-muted-foreground line-clamp-2">
                  {gregorianToPersian(image.uploadedAt)}
                  {image.note && ` · ${image.note}`}
                </figcaption>
              </figure>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
