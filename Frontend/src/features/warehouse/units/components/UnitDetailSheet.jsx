import { useId, useState } from "react";
import { History, Printer, QrCode } from "lucide-react";

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
import { gregorianToPersian } from "@/shared/lib/dateUtils";
import { UNIT_STATUS_LABELS } from "@/shared/domain/enums/unitStatus";

import UnitStatusBadge from "./UnitStatusBadge";
import { useProductUnitHistoryQuery } from "../services/queries";

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
 * سفرِ یک دانه: هر جابه‌جایی با تاریخ، دلیل، سند و طرفِ حساب — از دفترِ
 * حرکتِ دانه‌ها. «این دانه از کجا آمد و به کجا رفت» بدونِ گشتن در اسناد.
 */
function UnitHistory({ productUnitId, enabled }) {
  const { data, isLoading, isError } = useProductUnitHistoryQuery(productUnitId, {
    enabled,
  });
  const movements = data?.movements ?? [];

  return (
    <div className="space-y-2">
      <p className="flex items-center gap-1.5 text-sm font-medium">
        <History className="h-4 w-4 text-muted-foreground" />
        تاریخچه‌ی جابه‌جایی
      </p>
      {isLoading && <p className="text-xs text-muted-foreground">در حال بارگذاری...</p>}
      {isError && (
        <p className="text-xs text-destructive">تاریخچه‌ی این دانه خوانده نشد.</p>
      )}
      {!isLoading && !isError && movements.length === 0 && (
        <p className="text-xs text-muted-foreground">جابه‌جایی‌ای ثبت نشده است.</p>
      )}
      <ol className="relative space-y-3 border-s border-border ps-4">
        {movements.map((movement) => (
          <li key={movement.id} className="space-y-0.5">
            <span className="absolute -start-1.5 mt-1.5 h-3 w-3 rounded-full border border-background bg-primary/60" />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-medium">{movement.reasonTitle}</span>
              <span className="text-[11px] tabular-nums text-muted-foreground">
                {formatDate(movement.occurredAt)}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {movement.fromStatus != null
                ? `${UNIT_STATUS_LABELS[movement.fromStatus] ?? movement.fromStatus} ← `
                : ""}
              {UNIT_STATUS_LABELS[movement.toStatus] ?? movement.toStatus}
              {movement.documentNumber && ` · ${movement.documentNumber}`}
              {(movement.supplierName || movement.customerName) &&
                ` · ${movement.supplierName ?? movement.customerName}`}
              {movement.userName && ` · ${movement.userName}`}
            </p>
            {movement.note && (
              <p className="text-[11px] text-muted-foreground">{movement.note}</p>
            )}
          </li>
        ))}
      </ol>
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
            <Row label="سریال">
              <span className="tabular-nums">{unit.serialNumber ?? "—"}</span>
            </Row>
            {unit.purchaseId ? (
              <Row label="ورود با خرید">
                <span className="font-mono text-xs">
                  {unit.purchaseInvoiceNumber || unit.purchaseId}
                </span>
                {unit.supplierName && (
                  <span className="block text-[11px] text-muted-foreground">
                    {unit.supplierName}
                  </span>
                )}
              </Row>
            ) : null}
            {unit.saleId ? (
              <Row label="خروج با فروش">
                <span className="font-mono text-xs">
                  {unit.saleInvoiceNumber || unit.saleId}
                </span>
                {unit.customerName && (
                  <span className="block text-[11px] text-muted-foreground">
                    {unit.customerName}
                  </span>
                )}
              </Row>
            ) : null}
            {unit.soldAt ? (
              <Row label="تاریخ فروش">
                <span className="tabular-nums">{formatDate(unit.soldAt)}</span>
              </Row>
            ) : null}
          </div>

          <Separator />

          <UnitHistory productUnitId={unit.id} enabled={open} />
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
