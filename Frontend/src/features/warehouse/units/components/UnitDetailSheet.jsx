import { useId, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Barcode, History, Info, Lock, QrCode } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet";
import { Button } from "@/shared/components/ui/button";
import { Separator } from "@/shared/components/ui/separator";
import { Label } from "@/shared/components/ui/label";
import { Switch } from "@/shared/components/ui/switch";
import BarcodeGraphic from "@/shared/components/print/BarcodeGraphic";
import QrCodeGraphic from "@/shared/components/print/QrCodeGraphic";
import {
  ProductUnitStatusEnum as UNIT_STATUSES,
  UNIT_STATUS_LABELS,
} from "@/shared/domain/enums/unitStatus";

import {
  DocumentKindEnum,
  documentRouteOf,
  daysSince,
  fa,
  formatDate,
  needsLabel,
  whereaboutsOf,
} from "../domain/unitVocabulary";
import UnitStatusBadge from "./UnitStatusBadge";
import { unitOperationsFor } from "./unitOperations";
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
 * مسیرِ دانه در یک نگاه: جایگاه‌هایی که پشتِ سر گذاشته، به ترتیب — «الان
 * در چه مرحله‌ای است». حرکت‌های پشتِ‌سرِهم به یک جایگاه یکی می‌شوند.
 */
function JourneyStrip({ movements }) {
  const steps = [];
  movements.forEach((movement) => {
    const last = steps[steps.length - 1];
    if (last && last.status === movement.toStatus) return;
    steps.push({
      id: movement.id,
      status: movement.toStatus,
      party: movement.customerName ?? movement.supplierName ?? null,
      at: movement.occurredAt,
    });
  });
  if (steps.length === 0) return null;

  return (
    <ol className="flex flex-wrap items-center gap-1 text-xs">
      {steps.map((step, index) => {
        const current = index === steps.length - 1;
        return (
          <li key={step.id} className="flex items-center gap-1">
            {index > 0 && <span className="text-muted-foreground">←</span>}
            <span
              className={`rounded-md border px-1.5 py-0.5 ${
                current ? "border-primary bg-primary/10 font-medium" : "border-border text-muted-foreground"
              }`}
              title={formatDate(step.at)}
            >
              {UNIT_STATUS_LABELS[step.status] ?? step.status}
              {step.party && `، ${step.party}`}
            </span>
          </li>
        );
      })}
    </ol>
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
      <JourneyStrip movements={movements} />
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
                `، ${movement.supplierName ?? movement.customerName}`}
              {movement.userName && `، ${movement.userName}`}
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

/**
 * کارهای همین دانه — همان فهرستِ نوارِ انتخاب (`unitOperationsFor`)، تا
 * تکی و دسته‌ای یک رفتار داشته باشند. چاپ دکمه‌ی اصلی است؛ بقیه دوتایی.
 */
function UnitOperations({ unit, canManage, onAction, onPrint }) {
  const navigate = useNavigate();
  const operations = unitOperationsFor([unit], { canManage });
  const hints = [...new Set(operations.filter((op) => op.disabled && op.hint).map((op) => op.hint))];
  const secondary = operations.filter((op) => op.kind !== "print");

  if (operations.length === 0) {
    return <p className="text-xs text-muted-foreground">کاری روی این دانه باقی نمانده است.</p>;
  }

  const run = (operation) => {
    if (operation.kind === "print") onPrint(unit);
    else if (operation.kind === "return") navigate(operation.route);
    else onAction(operation.action, [unit]);
  };

  return (
    <section className="space-y-2" aria-label="کارهای این دانه">
      <div className="grid grid-cols-2 gap-2">
        {operations.map((operation) => {
          const Icon = operation.icon;
          const primary = operation.kind === "print";
          // دکمه‌ی تنهای آخرِ ردیف تمام‌عرض می‌شود تا چیدمان نشکند.
          const lonely = !primary && secondary.length % 2 === 1 && operation === secondary[secondary.length - 1];
          return (
            <Button
              key={operation.key}
              type="button"
              variant={primary ? "default" : "outline"}
              disabled={operation.disabled}
              className={`gap-2 ${primary || lonely ? "col-span-2" : ""} ${
                operation.destructive
                  ? "border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  : ""
              }`}
              onClick={() => run(operation)}
            >
              <Icon className="h-4 w-4" />
              {operation.label}
            </Button>
          );
        })}
      </div>
      {hints.map((hint) => (
        <p key={hint} className="flex items-start gap-1.5 text-[11px] leading-5 text-muted-foreground">
          <Lock className="mt-0.5 h-3 w-3 shrink-0" />
          {hint}
        </p>
      ))}
    </section>
  );
}

function SectionTitle({ icon: Icon, children, action }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <p className="flex items-center gap-1.5 text-sm font-medium">
        <Icon className="h-4 w-4 text-muted-foreground" />
        {children}
      </p>
      {action}
    </div>
  );
}

/** «کجاست؟» — جایگاه، طرفِ حساب یا علت، و سندِ مرتبط؛ یک ردیف مثلِ بقیه. */
function WhereaboutsValue({ unit }) {
  const where = whereaboutsOf(unit);
  const saleLink =
    unit.status === UNIT_STATUSES.SOLD ? documentRouteOf(DocumentKindEnum.SALE, unit.saleId) : null;
  return (
    <>
      <span className="font-medium">{where.place}</span>
      {where.detail && <span className="block text-[11px] text-muted-foreground">{where.detail}</span>}
      {where.document &&
        (saleLink ? (
          <Link to={saleLink} className="block font-mono text-[11px] underline-offset-2 hover:underline">
            {where.document}
          </Link>
        ) : (
          <span className="block font-mono text-[11px] text-muted-foreground">{where.document}</span>
        ))}
    </>
  );
}

/**
 * مقصد مشترکِ کارهای سطحِ دانه — از اسکن یا «جزئیات» در فهرست. از بالا:
 * کدِ دانه (برای تطبیق با برچسبِ توی دست)، کارهای مجاز، مشخصات (کجاست، منشأ،
 * فروش، قرنطینه، برچسب) و تاریخچه‌ی کاملِ جابه‌جایی.
 *
 * سوییچِ بارکد/QR فقط برای *خواندن* است — مثلاً برداشتنِ کد با موبایل.
 */
export default function UnitDetailSheet({ unit, open, onOpenChange, onPrint, onAction, canManage }) {
  const [showQr, setShowQr] = useState(false);
  const switchId = useId();

  if (!unit) return null;

  const quarantineDays = daysSince(unit.quarantinedAt);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" dir="rtl" className="w-full gap-0 sm:max-w-md">
        <SheetHeader className="space-y-1.5 border-b border-border">
          <SheetTitle className="pe-8 text-base">{unit.productName ?? "دانه‌ی کالا"}</SheetTitle>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <UnitStatusBadge status={unit.status} />
            <span className="tabular-nums">سریال {fa(unit.serialNumber)}</span>
          </div>
        </SheetHeader>

        <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
          <section className="space-y-2">
            <SectionTitle
              icon={showQr ? QrCode : Barcode}
              action={
                <Label
                  htmlFor={switchId}
                  className="flex cursor-pointer items-center gap-2 text-xs font-normal text-muted-foreground"
                >
                  نمایش QR
                  <Switch
                    id={switchId}
                    checked={showQr}
                    onCheckedChange={setShowQr}
                    aria-label="نمایش کد QR به‌جای بارکد"
                  />
                </Label>
              }
            >
              کد دانه
            </SectionTitle>
            <div className="flex justify-center rounded-xl border border-border bg-white p-3">
              {showQr ? (
                <QrCodeGraphic value={unit.barcodePayload} text={unit.barcode} preset="display" />
              ) : (
                <BarcodeGraphic value={unit.barcodePayload} text={unit.barcode} preset="display" />
              )}
            </div>
          </section>

          <UnitOperations unit={unit} canManage={canManage} onAction={onAction} onPrint={onPrint} />

          <Separator />

          <section className="space-y-1">
            <SectionTitle icon={Info}>مشخصات</SectionTitle>
            <div className="divide-y divide-border">
              <Row label="کجاست">
                <WhereaboutsValue unit={unit} />
              </Row>
              <Row label="کد کالا">
                <span className="font-mono text-xs">{unit.productCode ?? "—"}</span>
              </Row>
              <Row label="ورود به انبار">
                <span className="tabular-nums">{formatDate(unit.createdAt)}</span>
              </Row>
              <Row label="منشأ">
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
              {unit.saleId && unit.status !== UNIT_STATUSES.SOLD && (
                <Row label="فروش">
                  <DocumentLink kind={DocumentKindEnum.SALE} id={unit.saleId} number={unit.saleInvoiceNumber} />
                  {unit.customerName && (
                    <span className="block text-[11px] text-muted-foreground">{unit.customerName}</span>
                  )}
                </Row>
              )}
              {unit.soldAt && (
                <Row label="تاریخ فروش">
                  <span className="tabular-nums">{formatDate(unit.soldAt)}</span>
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
              <Row label="برچسب">
                {unit.printCount > 0 ? (
                  <span className="text-xs">
                    {fa(unit.printCount)} بار، آخرین {formatDate(unit.lastPrintedAt)}
                    {unit.lastPrintedByName && (
                      <span className="block text-[11px] text-muted-foreground">
                        توسط {unit.lastPrintedByName}
                      </span>
                    )}
                  </span>
                ) : needsLabel(unit) ? (
                  <span className="text-xs text-amber-700 dark:text-amber-400">هنوز برچسب نخورده</span>
                ) : (
                  <span className="text-xs text-muted-foreground">چاپی ثبت نشده</span>
                )}
              </Row>
            </div>
          </section>

          <Separator />

          <UnitHistory productUnitId={unit.id} enabled={open} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
