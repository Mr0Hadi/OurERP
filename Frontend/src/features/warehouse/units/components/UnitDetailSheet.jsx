import { useId, useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, History, Printer, QrCode, Tag } from "lucide-react";

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
import {
  UNIT_STATUS_LABELS,
  UNIT_CUSTODY_REASON_LABELS,
  UnitCustodyReasonEnum as CUSTODY,
} from "@/shared/domain/enums/unitStatus";

import {
  DocumentKindEnum,
  UNIT_ACTION_META,
  UnitActionEnum,
  allowedActionsOf,
  documentRouteOf,
  daysSince,
  fa,
  formatDate,
  isPurchaseQuarantine,
  needsLabel,
  purchaseReturnRouteOf,
  whereaboutsOf,
} from "../domain/unitVocabulary";
import UnitStatusBadge from "./UnitStatusBadge";
import { useProductUnitHistoryQuery } from "../services/queries";

function Row({ label, children }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm text-end">{children}</span>
    </div>
  );
}

function DocumentLink({ kind, id, number }) {
  const to = documentRouteOf(kind, id);
  const text = number || (id ? `#${id}` : "—");
  return to ? (
    <Link to={to} className="font-mono text-xs underline-offset-2 hover:underline">
      {text}
    </Link>
  ) : (
    <span className="font-mono text-xs">{text}</span>
  );
}

/**
 * سفرِ یک دانه: هر جابه‌جایی با تاریخ، دلیل، سند، طرفِ حساب و کاربر — از
 * دفترِ حرکتِ دانه‌ها. «از کجا آمد و به کجا رفت» بدونِ گشتن در اسناد.
 */
function UnitHistory({ productUnitId, enabled }) {
  const { data, isLoading, isError } = useProductUnitHistoryQuery(productUnitId, { enabled });
  const movements = data?.movements ?? [];

  return (
    <div className="space-y-2">
      <p className="flex items-center gap-1.5 text-sm font-medium">
        <History className="h-4 w-4 text-muted-foreground" />
        تاریخچه‌ی جابه‌جایی
      </p>
      {isLoading && <p className="text-xs text-muted-foreground">در حال بارگذاری...</p>}
      {isError && <p className="text-xs text-destructive">تاریخچه‌ی این دانه خوانده نشد.</p>}
      {!isLoading && !isError && movements.length === 0 && (
        <p className="text-xs text-muted-foreground">جابه‌جایی‌ای ثبت نشده است.</p>
      )}
      <ol className="relative space-y-3 border-s border-border ps-4">
        {movements.map((movement) => (
          <li key={movement.id} className="relative space-y-0.5">
            <span className="absolute -start-[1.4rem] mt-1.5 h-3 w-3 rounded-full border border-background bg-primary/60" />
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
              {(movement.supplierName || movement.customerName) &&
                ` · ${movement.supplierName ?? movement.customerName}`}
              {movement.userName && ` · ${movement.userName}`}
            </p>
            {movement.documentId && (
              <DocumentLink
                kind={movement.documentKind}
                id={movement.documentId}
                number={movement.documentNumber}
              />
            )}
            {(movement.actionReasonTitle || movement.note) && (
              <p className="text-[11px] text-muted-foreground">
                {[movement.actionReasonTitle, movement.note].filter(Boolean).join(" — ")}
              </p>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

/** کارهای مجاز روی همین دانه، یا راهنمای مسیری که تکلیفش از آن روشن می‌شود. */
function UnitActions({ unit, canManage, onAction }) {
  const actions = canManage ? allowedActionsOf(unit) : [];
  const returnRoute = purchaseReturnRouteOf(unit);

  if (!actions.length && !returnRoute) return null;

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">کارِ انبار</p>
      {isPurchaseQuarantine(unit) && (
        <p className="text-xs text-muted-foreground">
          این دانه هنگامِ دریافتِ خرید قرنطینه شده و حسابش با تامین‌کننده باز است؛ عودت،
          آزادسازی یا اسقاطش از «مرجوعی خرید» ثبت می‌شود.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {returnRoute && (
          <Button asChild variant="outline" size="sm" className="gap-1">
            <Link to={returnRoute}>
              <ExternalLink className="h-3.5 w-3.5" />
              {unit.custodyReason === CUSTODY.CUSTOMER_RETURN
                ? "ادعا از تامین‌کننده"
                : "تعیین تکلیف در مرجوعی خرید"}
            </Link>
          </Button>
        )}
        {actions.map((action) => (
          <Button
            key={action}
            type="button"
            size="sm"
            variant={action === UnitActionEnum.SCRAP ? "destructive" : "outline"}
            onClick={() => onAction(action, [unit])}
          >
            {UNIT_ACTION_META[action].label}
          </Button>
        ))}
      </div>
    </div>
  );
}

/**
 * مقصد مشترکِ کارهای سطحِ دانه — از اسکن یا از کلیک روی ردیف: کجاست،
 * از کجا آمده، برچسبش چه شد، و هر جابه‌جایی‌اش. چاپِ دوباره‌ی برچسبِ
 * افتاده و کارهای انبار هم همین‌جاست.
 *
 * سوییچِ بارکد/QR فقط برای *خواندن* است — مثلاً برداشتنِ کد با موبایل.
 */
export default function UnitDetailSheet({ unit, open, onOpenChange, onPrint, onAction, canManage }) {
  const [showQr, setShowQr] = useState(false);
  const switchId = useId();

  if (!unit) return null;

  const where = whereaboutsOf(unit);
  const quarantineDays = daysSince(unit.quarantinedAt);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" dir="rtl" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="font-mono text-base">
            <span dir="ltr">{unit.barcode}</span>
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4 overflow-y-auto px-4 pb-4">
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
                <QrCodeGraphic value={unit.barcodePayload} text={unit.barcode} preset="display" />
              ) : (
                <BarcodeGraphic value={unit.barcodePayload} text={unit.barcode} preset="display" />
              )}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">کجاست؟</span>
              <span className="text-sm font-medium">{where.place}</span>
              {where.detail && <span className="text-xs text-muted-foreground">{where.detail}</span>}
            </div>
            <UnitStatusBadge status={unit.status} />
          </div>

          <UnitActions unit={unit} canManage={canManage} onAction={onAction} />

          <Separator />

          <div className="divide-y divide-border">
            <Row label="کالا">
              <span className="font-light">{unit.productName}</span>
              <span className="block font-mono text-[11px] text-muted-foreground">
                {unit.productCode}
              </span>
            </Row>
            <Row label="سریال">
              <span className="tabular-nums">{fa(unit.serialNumber)}</span>
            </Row>
            {unit.custodyReason && (
              <Row label="علت نگهداری">{UNIT_CUSTODY_REASON_LABELS[unit.custodyReason]}</Row>
            )}
            <Row label="ورود به انبار">
              <span className="tabular-nums">{formatDate(unit.createdAt)}</span>
            </Row>
            <Row label="ورود با خرید">
              {unit.purchaseId ? (
                <>
                  <DocumentLink
                    kind={DocumentKindEnum.PURCHASE}
                    id={unit.purchaseId}
                    number={unit.purchaseInvoiceNumber}
                  />
                  {unit.supplierName && (
                    <span className="block text-[11px] text-muted-foreground">{unit.supplierName}</span>
                  )}
                </>
              ) : (
                <span className="text-xs text-muted-foreground">موجودی اولیه / اصلاح</span>
              )}
            </Row>
            {unit.saleId && (
              <Row label="خروج با فروش">
                <DocumentLink
                  kind={DocumentKindEnum.SALE}
                  id={unit.saleId}
                  number={unit.saleInvoiceNumber}
                />
                {unit.customerName && (
                  <span className="block text-[11px] text-muted-foreground">{unit.customerName}</span>
                )}
                {unit.soldAt && (
                  <span className="block text-[11px] tabular-nums text-muted-foreground">
                    {formatDate(unit.soldAt)}
                  </span>
                )}
              </Row>
            )}
            {unit.quarantinedAt && (
              <Row label="در قرنطینه از">
                <span className="tabular-nums">
                  {formatDate(unit.quarantinedAt)}
                  {quarantineDays != null && ` (${fa(quarantineDays)} روز)`}
                </span>
                {unit.quarantineDocumentId && (
                  <span className="block">
                    <DocumentLink
                      kind={unit.quarantineDocumentKind}
                      id={unit.quarantineDocumentId}
                      number={unit.quarantineDocumentNumber}
                    />
                  </span>
                )}
              </Row>
            )}
            {unit.quarantineCost != null && (
              <Row label="ارزشِ نگه‌داشته">
                <span className="tabular-nums">{fa(unit.quarantineCost)} ریال</span>
              </Row>
            )}
          </div>

          <Separator />

          <div className="space-y-1">
            <p className="flex items-center gap-1.5 text-sm font-medium">
              <Tag className="h-4 w-4 text-muted-foreground" />
              برچسب
            </p>
            {unit.printCount > 0 ? (
              <p className="text-xs text-muted-foreground">
                {fa(unit.printCount)} بار چاپ شده · اولین {formatDate(unit.firstPrintedAt)} · آخرین{" "}
                {formatDate(unit.lastPrintedAt)}
                {unit.lastPrintedByName && ` توسط ${unit.lastPrintedByName}`}
              </p>
            ) : (
              <p
                className={`text-xs ${needsLabel(unit) ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground"}`}
              >
                {needsLabel(unit)
                  ? "هنوز برچسب نخورده — در صفِ چاپ است."
                  : "چاپی ثبت نشده است."}
              </p>
            )}
          </div>

          <Separator />

          <UnitHistory productUnitId={unit.id} enabled={open} />
        </div>

        <SheetFooter>
          <Button type="button" size="lg" className="w-full gap-2" onClick={() => onPrint(unit)}>
            <Printer className="h-4 w-4" />
            {unit.printCount > 0 ? "چاپ دوباره‌ی برچسب" : "چاپ برچسب"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
