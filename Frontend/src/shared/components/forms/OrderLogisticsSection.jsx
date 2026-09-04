import { Truck, Phone, StickyNote } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { gregorianToPersian } from "@/shared/utils/dateUtils";

/**
 * راننده‌ها و یادداشت‌های تحویلِ یک سند — فقط‌خواندنی.
 *
 * این داده‌ها را انبار هنگام دریافت (خرید) یا ارسال (فروش) ثبت می‌کند،
 * نه کاربرِ این فرم؛ پس اینجا فقط نمایش داده می‌شوند. سرور هر دو را در
 * جزئیاتِ سند می‌فرستاد ولی هیچ صفحه‌ای نشانشان نمی‌داد — کسی که فاکتور
 * را باز می‌کرد نمی‌فهمید کالا را چه کسی و با چه ماشینی آورده.
 *
 * کارت وقتی هیچ راننده و یادداشتی نیست اصلاً رندر نمی‌شود، تا فرم‌های
 * سندهای بدون حمل شلوغ نشود.
 */
export default function OrderLogisticsSection({
  title = "تحویل و حمل",
  drivers = [],
  notes = [],
  notesLabel = "یادداشت‌های تحویل",
}) {
  if (drivers.length === 0 && notes.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-card-foreground flex items-center gap-2">
          <Truck className="h-4 w-4 text-muted-foreground" />
          {title}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        {drivers.length > 0 && (
          <div className="space-y-2">
            {drivers.map((driver, idx) => (
              <div
                key={driver.id ?? idx}
                className="rounded-lg border border-border bg-card p-2.5 space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-card-foreground">
                    {driver.driverFullName || "راننده بدون نام"}
                  </span>
                  {driver.createdAt && (
                    <span className="text-[11px] text-muted-foreground tabular-nums">
                      {gregorianToPersian(driver.createdAt)}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {driver.driverPhoneNumber && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      <span dir="ltr" className="tabular-nums">
                        {driver.driverPhoneNumber}
                      </span>
                    </span>
                  )}
                  {driver.vehiclePlate && (
                    <span className="flex items-center gap-1">
                      <Truck className="h-3 w-3" />
                      <span>پلاک {driver.vehiclePlate}</span>
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {notes.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <StickyNote className="h-3.5 w-3.5" />
              {notesLabel}
            </p>
            {notes.map((note, idx) => (
              <div
                key={note.id ?? idx}
                className="rounded-md bg-muted px-2.5 py-2 space-y-1"
              >
                <p className="text-xs text-card-foreground whitespace-pre-wrap">
                  {note.note}
                </p>
                {note.createdAt && (
                  <p className="text-[11px] text-muted-foreground tabular-nums">
                    {gregorianToPersian(note.createdAt)}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
