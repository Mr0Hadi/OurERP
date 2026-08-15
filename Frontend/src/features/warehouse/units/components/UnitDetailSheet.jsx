// src/features/warehouse/units/components/UnitDetailSheet.jsx
import { Printer, Wrench } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/shared/components/ui/sheet";
import { Button } from "@/shared/components/ui/button";
import { Separator } from "@/shared/components/ui/separator";
import BarcodeGraphic from "@/shared/components/print/BarcodeGraphic";
import { gregorianToPersian } from "@/shared/utils/dateUtils";

import UnitStatusBadge from "./UnitStatusBadge";
import { UNIT_SOURCE_TYPE_LABELS } from "../services/mockData";

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
 * مقصد مشترکِ همه‌ی کارهای سطحِ واحد: چه از اسکن رسیده باشی، چه از
 * کلیک روی ردیف جدول. چاپ مجدد همین‌جاست تا انباردار برای برچسبِ
 * افتاده مجبور نباشد واحد تازه بسازد.
 */
export default function UnitDetailSheet({
  unit,
  open,
  onOpenChange,
  onReprint,
  onChangeStatus,
}) {
  if (!unit) return null;

  const isReprint = (unit.printCount || 0) > 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" dir="rtl" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="font-mono text-base">
            {unit.unitCode}
          </SheetTitle>
        </SheetHeader>

        <div className="px-4 space-y-4 overflow-y-auto">
          <div className="flex justify-center rounded-lg border border-border bg-white p-3">
            <BarcodeGraphic value={unit.unitCode} preset="label" />
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
            <Row label="منشأ">
              {UNIT_SOURCE_TYPE_LABELS[unit.source?.type] ?? "—"}
              {unit.source?.refNumber ? (
                <span className="block font-mono text-[11px] text-muted-foreground">
                  {unit.source.refNumber}
                </span>
              ) : null}
            </Row>
            <Row label="تاریخ ساخت">
              <span className="tabular-nums">{formatDate(unit.createdAt)}</span>
            </Row>
            <Row label="چاپ اول">
              <span className="tabular-nums">
                {formatDate(unit.firstPrintedAt)}
              </span>
            </Row>
            <Row label="آخرین چاپ">
              <span className="tabular-nums">
                {formatDate(unit.lastPrintedAt)}
              </span>
            </Row>
            <Row label="تعداد چاپ">
              <span className="tabular-nums">{unit.printCount || 0}</span>
            </Row>
            {unit.saleId ? (
              <Row label="فروش">
                <span className="font-mono text-xs">{unit.saleId}</span>
              </Row>
            ) : null}
            {unit.statusNote ? (
              <Row label="توضیح وضعیت">
                <span className="text-xs text-muted-foreground">
                  {unit.statusNote}
                </span>
              </Row>
            ) : null}
          </div>
        </div>

        <SheetFooter className="gap-2">
          <Button
            type="button"
            size="lg"
            className="w-full gap-2"
            onClick={() => onReprint(unit)}
          >
            <Printer className="h-4 w-4" />
            {isReprint ? "چاپ مجدد برچسب" : "چاپ برچسب"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full gap-2"
            onClick={() => onChangeStatus(unit)}
          >
            <Wrench className="h-4 w-4" />
            ثبت وضعیت (آسیب‌دیده / مفقود)
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
