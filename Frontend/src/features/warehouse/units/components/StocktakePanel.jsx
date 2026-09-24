import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Download,
  RefreshCw,
  RotateCcw,
  SearchX,
  X,
} from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Progress } from "@/shared/components/ui/progress";
import EntitySelect from "@/shared/components/filters/EntitySelect";
import QueryErrorState from "@/shared/components/feedback/QueryErrorState";
import {
  ProductUnitStatusEnum as UNIT_STATUSES,
  UNIT_STATUS_LABELS,
} from "@/shared/domain/enums/unitStatus";

import { fa, formatDate, whereaboutsOf } from "../domain/unitVocabulary";
import { SCAN_OUTCOMES, classifyScan, summarizeStocktake } from "../domain/stocktake";
import { downloadUnitsCsv } from "../domain/unitCsv";
import { useStocktakeStore } from "../store/stocktakeStore";
import { useStocktakeExpectedQuery } from "../services/queries";
import { useResolveScannedCodeMutation } from "../services/mutations";
import ScanInput from "./ScanInput";

const getProductLabel = (product) => product.name ?? "";
const renderProductMeta = (product) => (
  <span className="font-mono text-[11px] text-muted-foreground">{product.code}</span>
);

/** لرزشِ کوتاه روی دستگاهِ دستی — انباردار بی‌نگاه به صفحه بفهمد اسکن مشکل داشت. */
const buzz = () => navigator.vibrate?.([80, 60, 80]);

const LAST_SCAN_STYLES = {
  [SCAN_OUTCOMES.COUNTED]: "bg-green-50 text-green-800 dark:bg-green-950/40 dark:text-green-300",
  [SCAN_OUTCOMES.DUPLICATE]: "bg-muted text-muted-foreground",
  [SCAN_OUTCOMES.UNEXPECTED]: "bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200",
  [SCAN_OUTCOMES.INVALID]: "bg-destructive/10 text-destructive",
};

const LAST_SCAN_TEXT = {
  [SCAN_OUTCOMES.COUNTED]: "شمرده شد",
  [SCAN_OUTCOMES.DUPLICATE]: "قبلاً شمرده شده بود",
  [SCAN_OUTCOMES.UNEXPECTED]: "غیرمنتظره — در فهرستِ این کالا نیست",
  [SCAN_OUTCOMES.INVALID]: "این کد بارکدِ دانه نیست",
};

/** چرا این اسکن در فهرستِ انتظار نبود — از روی پاسخِ سرور. */
function unexpectedReason(entry, productId) {
  if (entry.state === "pending") return "در حال بررسی…";
  if (!entry.unit) return "در سیستم ثبت نشده است";
  if (entry.unit.productId !== Number(productId)) {
    return `دانه‌ی کالای دیگر: ${entry.unit.productName} (${UNIT_STATUS_LABELS[entry.unit.status]})`;
  }
  if (entry.unit.status !== UNIT_STATUSES.IN_STOCK) {
    const where = whereaboutsOf(entry.unit);
    return `در سیستم «${UNIT_STATUS_LABELS[entry.unit.status]}» است${where.detail ? ` — ${where.detail}` : ""}`;
  }
  return "بعد از شروعِ شمارش وارد انبار شده";
}

function UnitRow({ unit, onOpen, trailing }) {
  return (
    <li className="flex items-center justify-between gap-2 py-1.5">
      <button
        type="button"
        onClick={() => onOpen(unit)}
        className="min-w-0 text-start font-mono text-xs underline-offset-2 hover:underline"
        dir="ltr"
      >
        {unit.barcode}
      </button>
      {trailing}
    </li>
  );
}

function ResultSection({ title, icon: Icon, tone, count, children, emptyText }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <p className={`mb-2 flex items-center gap-1.5 text-sm font-medium ${tone}`}>
        <Icon className="h-4 w-4" />
        {title}
        <span className="ms-auto tabular-nums">{fa(count)}</span>
      </p>
      {count === 0 ? (
        <p className="text-xs text-muted-foreground">{emptyText}</p>
      ) : (
        <ul className="max-h-72 divide-y divide-border overflow-y-auto">{children}</ul>
      )}
    </div>
  );
}

function StartStocktake({ products, isProductsLoading, onStart }) {
  const [productId, setProductId] = useState("");
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardCheck className="h-5 w-5 text-muted-foreground" />
          شمارشِ دانه‌ای
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          یک کالا را انتخاب کنید و همه‌ی دانه‌هایش را از روی قفسه اسکن کنید. در پایان
          می‌بینید کدام دانه‌ها طبقِ سیستم باید باشند ولی پیدا نشدند، و کدام اسکن‌ها
          غیرمنتظره بودند (کالای دیگر، فروخته‌شده، اسقاط‌شده یا ثبت‌نشده). شمارش در همین
          مرورگر نگه داشته می‌شود و با رفرش از دست نمی‌رود.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <EntitySelect
              label="کالا"
              placeholder="انتخاب کالا"
              emptyText="کالایی یافت نشد"
              items={products}
              value={productId}
              onSelect={setProductId}
              isLoading={isProductsLoading}
              getLabel={getProductLabel}
              renderMeta={renderProductMeta}
            />
          </div>
          <Button type="button" size="lg" disabled={!productId} onClick={() => onStart(productId)}>
            شروع شمارش
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * شمارشِ دانه‌ای (cycle count): قفسه در برابرِ دفترِ دانه‌ها، برای یک کالا.
 *
 * فهرستِ انتظار یک بار در شروع خوانده می‌شود و در طولِ شمارش ثابت است؛
 * اگر وسطِ کار فروش یا دریافتی ثبت شد، «به‌روزرسانیِ فهرست» آن را از نو
 * می‌خواند بی‌آنکه اسکن‌ها پاک شوند.
 *
 * نتیجه چیزی را در سرور عوض نمی‌کند — بکند هنوز دستورِ «اصلاحِ شمارش»
 * ندارد (بند ۶ سندِ نیازمندی‌ها). خروجیِ CSV برای پیگیری است.
 */
export default function StocktakePanel({ products, isProductsLoading, onOpenUnit }) {
  const stocktake = useStocktakeStore();
  const { productId } = stocktake;
  const expectedQuery = useStocktakeExpectedQuery(productId);
  const resolveCode = useResolveScannedCodeMutation({ silent: true });

  const expectedUnits = useMemo(() => expectedQuery.data?.items ?? [], [expectedQuery.data]);
  const expectedByPayload = useMemo(
    () => new Map(expectedUnits.map((unit) => [unit.barcodePayload, unit])),
    [expectedUnits],
  );
  const countedSet = useMemo(() => new Set(stocktake.counted), [stocktake.counted]);
  const result = useMemo(
    () => summarizeStocktake(expectedUnits, countedSet, stocktake.unexpected),
    [expectedUnits, countedSet, stocktake.unexpected],
  );

  const product = products.find((p) => String(p.id) === String(productId));

  if (!productId) {
    return (
      <StartStocktake
        products={products}
        isProductsLoading={isProductsLoading}
        onStart={stocktake.start}
      />
    );
  }

  const handleScan = (code) => {
    const scan = classifyScan(code, expectedByPayload, countedSet);
    const payload = scan.reference.normalizedPayload;
    stocktake.setLastScan({ code, outcome: scan.outcome, at: new Date().toISOString() });

    if (scan.outcome === SCAN_OUTCOMES.COUNTED) {
      stocktake.addCounted(payload);
      return;
    }
    if (scan.outcome !== SCAN_OUTCOMES.UNEXPECTED) {
      if (scan.outcome === SCAN_OUTCOMES.INVALID) buzz();
      return;
    }

    buzz();
    if (stocktake.unexpected.some((entry) => entry.payload === payload)) return;
    stocktake.addUnexpected({ payload, code, at: new Date().toISOString(), state: "pending", unit: null });
    resolveCode.mutate(code, {
      onSuccess: (resolved) =>
        stocktake.resolveUnexpected(payload, { state: "resolved", unit: resolved.unit ?? null }),
      onError: () => stocktake.resolveUnexpected(payload, { state: "resolved", unit: null }),
    });
  };

  const exportResult = () =>
    downloadUnitsCsv(
      [
        ...result.missing,
        ...stocktake.unexpected.filter((entry) => entry.unit).map((entry) => entry.unit),
      ],
      `stocktake-${product?.code ?? productId}`,
    );

  const lastScan = stocktake.lastScan;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <CardTitle className="text-base">شمارش: {product?.name ?? `کالای #${productId}`}</CardTitle>
              <p className="text-xs text-muted-foreground">
                شروع {formatDate(stocktake.startedAt)} · فهرستِ انتظار: {fa(result.expected)} دانه‌ی «در انبار»
                {expectedQuery.data?.truncated && " (بیش از سقفِ خواندن — فهرست ناقص است)"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={() => expectedQuery.refetch()}
                disabled={expectedQuery.isFetching}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${expectedQuery.isFetching ? "animate-spin" : ""}`} />
                به‌روزرسانیِ فهرست
              </Button>
              <Button type="button" variant="outline" size="sm" className="gap-1" onClick={exportResult}>
                <Download className="h-3.5 w-3.5" />
                خروجیِ مغایرت‌ها
              </Button>
              <Button type="button" variant="ghost" size="sm" className="gap-1" onClick={stocktake.restart}>
                <RotateCcw className="h-3.5 w-3.5" />
                از نو
              </Button>
              <Button type="button" variant="ghost" size="sm" className="gap-1" onClick={stocktake.reset}>
                <X className="h-3.5 w-3.5" />
                پایان
              </Button>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs tabular-nums text-muted-foreground">
              <span>
                {fa(result.counted.length)} از {fa(result.expected)} شمرده شد
              </span>
              <span>{fa(Math.round(result.progress * 100))}٪</span>
            </div>
            <Progress value={result.progress * 100} />
          </div>
        </CardHeader>

        <CardContent className="space-y-2">
          {expectedQuery.isError ? (
            <QueryErrorState error={expectedQuery.error} onRetry={() => expectedQuery.refetch()} />
          ) : (
            <ScanInput
              onSubmit={handleScan}
              continuous
              autoFocusKey={productId}
              isBusy={expectedQuery.isLoading}
              submitLabel="شمردن"
              placeholder={
                expectedQuery.isLoading ? "در حال خواندنِ فهرست…" : "دانه‌های روی قفسه را اسکن کنید…"
              }
            />
          )}
          {lastScan && (
            <p
              className={`rounded-md px-2 py-1 text-xs ${LAST_SCAN_STYLES[lastScan.outcome]}`}
              aria-live="polite"
            >
              {LAST_SCAN_TEXT[lastScan.outcome]} ·{" "}
              <span className="font-mono" dir="ltr">
                {lastScan.code}
              </span>
            </p>
          )}
        </CardContent>
      </Card>

      {result.isClean && result.counted.length === result.expected && result.expected > 0 && (
        <p className="flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-800 dark:bg-green-950/40 dark:text-green-300">
          <CheckCircle2 className="h-5 w-5" />
          شمارش کامل و بی‌مغایرت است: همه‌ی {fa(result.expected)} دانه روی قفسه‌اند.
        </p>
      )}

      <div className="grid gap-3 lg:grid-cols-3">
        <ResultSection
          title="پیدانشده"
          icon={SearchX}
          tone="text-destructive"
          count={result.missing.length}
          emptyText="هیچ دانه‌ای جا نمانده."
        >
          {result.missing.map((unit) => (
            <UnitRow
              key={unit.id}
              unit={unit}
              onOpen={onOpenUnit}
              trailing={
                <span className="text-[11px] tabular-nums text-muted-foreground">
                  سریال {fa(unit.serialNumber)}
                </span>
              }
            />
          ))}
        </ResultSection>

        <ResultSection
          title="غیرمنتظره"
          icon={AlertTriangle}
          tone="text-amber-700 dark:text-amber-400"
          count={stocktake.unexpected.length}
          emptyText="اسکنِ غیرمنتظره‌ای نبود."
        >
          {stocktake.unexpected.map((entry) => (
            <li key={entry.payload} className="flex items-start justify-between gap-2 py-1.5">
              <div className="min-w-0">
                {entry.unit ? (
                  <button
                    type="button"
                    onClick={() => onOpenUnit(entry.unit)}
                    className="font-mono text-xs underline-offset-2 hover:underline"
                    dir="ltr"
                  >
                    {entry.unit.barcode}
                  </button>
                ) : (
                  <span className="font-mono text-xs" dir="ltr">
                    {entry.code}
                  </span>
                )}
                <p className="text-[11px] text-muted-foreground">
                  {unexpectedReason(entry, productId)}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={() => stocktake.removeUnexpected(entry.payload)}
                aria-label="حذف از غیرمنتظره‌ها"
              >
                <X className="h-3 w-3" />
              </Button>
            </li>
          ))}
        </ResultSection>

        <ResultSection
          title="شمرده‌شده"
          icon={CheckCircle2}
          tone="text-green-700 dark:text-green-400"
          count={result.counted.length}
          emptyText="هنوز چیزی اسکن نشده."
        >
          {result.counted.map((unit) => (
            <UnitRow
              key={unit.id}
              unit={unit}
              onOpen={onOpenUnit}
              trailing={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => stocktake.removeCounted(unit.barcodePayload)}
                  aria-label="برگرداندنِ این اسکن"
                >
                  <X className="h-3 w-3" />
                </Button>
              }
            />
          ))}
        </ResultSection>
      </div>
    </div>
  );
}
