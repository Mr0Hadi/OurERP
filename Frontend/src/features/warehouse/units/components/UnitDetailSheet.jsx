import { useId, useState } from "react";
import { Printer, QrCode } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/shared/components/ui/sheet";
import { Button } from "@/shared/components/ui/button";
import { Separator } from "@/shared/components/ui/separator";
import { Label } from "@/shared/components/ui/label";
import { Switch } from "@/shared/components/ui/switch";
import BarcodeGraphic from "@/shared/components/print/BarcodeGraphic";
import QrCodeGraphic from "@/shared/components/print/QrCodeGraphic";
import { gregorianToPersian } from "@/shared/utils/dateUtils";

import UnitStatusBadge from "./UnitStatusBadge";

const formatDate = (value) =>
  value ? gregorianToPersian(value.slice(0, 10)) : "—";

function Row({ label, children }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm text-end">{children}</span>
    </div>
  );
}

/**
 * مقصد مشترکِ کارهای سطحِ دانه: چه از اسکن رسیده باشی، چه از کلیک روی
 * ردیف جدول. چاپ همین‌جاست تا انباردار برای برچسبِ افتاده لازم نباشد
 * جای دیگری برود.
 *
 * سوییچِ بارکد/QR اینجا فقط برای *خواندن* است — مثلاً وقتی انباردار
 * می‌خواهد کدِ همین دانه را با موبایل بردارد بی‌آنکه چیزی چاپ کند.
 * اینکه روی برچسبِ چاپی کدام نماد برود، تصمیمِ جداگانه‌ای است و در
 * پیش‌نمایشِ چاپ گرفته می‌شود (`labelCodeKind`).
 */
export default function UnitDetailSheet({ unit, open, onOpenChange, onPrint }) {
  const [showQr, setShowQr] = useState(false);
  const switchId = useId();

  if (!unit) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" dir="rtl" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="font-mono text-base">
            {unit.barcode}
          </SheetTitle>
        </SheetHeader>

        <div className="px-4 space-y-4 overflow-y-auto">
          <div className="space-y-2">
            <div className="flex items-center justify-end gap-2">
              <Label
                htmlFor={switchId}
                className="flex cursor-pointer items-center gap-1 text-xs font-normal text-muted-foreground"
              >
                <QrCode className="h-4 w-4" />
                نمایش کد QR
              </Label>
              <Switch
                id={switchId}
                checked={showQr}
                onCheckedChange={setShowQr}
                aria-label="نمایش کد QR به‌جای بارکد"
              />
            </div>

            <div className="flex justify-center rounded-lg border border-border bg-white p-3">
              {showQr ? (
                <QrCodeGraphic
                  value={unit.barcodePayload}
                  text={unit.barcode}
                  preset="display"
                />
              ) : (
                <BarcodeGraphic
                  value={unit.barcodePayload}
                  text={unit.barcode}
                  preset="display"
                />
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">وضعیت</span>
            <UnitStatusBadge status={unit.status} />
          </div>

          <Separator />

          <div className="divide-y divide-border">
            <Row label="کالا">
              <span className="font-light">{unit.productName}</span>
              <span className="block font-mono text-[11px] text-muted-foreground">
                {unit.productCode}
              </span>
            </Row>
            {unit.purchaseItemId ? (
              <Row label="قلم خرید">
                <span className="font-mono text-xs">{unit.purchaseItemId}</span>
              </Row>
            ) : null}
            <Row label="سریال">
              <span className="tabular-nums">{unit.serialNumber ?? "—"}</span>
            </Row>
            <Row label="تاریخ ساخت">
              <span className="tabular-nums">{formatDate(unit.createdAt)}</span>
            </Row>
            {unit.soldAt ? (
              <Row label="تاریخ فروش">
                <span className="tabular-nums">{formatDate(unit.soldAt)}</span>
              </Row>
            ) : null}
            {unit.saleItemId || unit.saleId ? (
              <Row label="فروش">
                <span className="font-mono text-xs">
                  {unit.saleItemId ?? unit.saleId}
                </span>
              </Row>
            ) : null}
          </div>
        </div>

        <SheetFooter>
          <Button
            type="button"
            size="lg"
            className="w-full gap-2"
            onClick={() => onPrint(unit)}
          >
            <Printer className="h-4 w-4" />
            چاپ برچسب
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
