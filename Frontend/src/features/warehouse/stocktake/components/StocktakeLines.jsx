import { useState } from "react";
import { Save, Undo2, X } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import SectionCard from "@/shared/components/forms/SectionCard";
import QuantityStepper from "@/shared/components/forms/QuantityStepper";
import FilterSearchInput from "@/shared/components/filters/FilterSearchInput";
import StatusBadge from "@/shared/components/status/StatusBadge";
import { STOCKTAKE_COUNT_MODE_LABELS, StocktakeCountModeEnum } from "@/shared/domain/enums/stocktake";
import { useIsMobile } from "@/shared/hooks/useIsMobile";
import { formatNumber } from "@/shared/lib/numberFormat";
import { toneText } from "@/shared/lib/tone";
import { cn } from "@/shared/lib/utils";
import { LINE_FILTER, acceptsManualCount, lineFilterCounts, visibleLines } from "../domain/stocktake";
import { useRemoveStocktakeScanMutation } from "../services/mutations";

/** ردیف‌های هر صفحه؛ دامنه‌ی یک دسته ممکن است صدها کالا باشد. */
const PAGE = 50;

const MODE_TONES = {
  [StocktakeCountModeEnum.NONE]: "neutral",
  [StocktakeCountModeEnum.SCAN]: "info",
  [StocktakeCountModeEnum.MANUAL]: "primary",
};

const signed = (value) => (value > 0 ? `+${formatNumber(value)}` : formatNumber(value));
const differenceTone = (value) => toneText(value > 0 ? "success" : value < 0 ? "danger" : "neutral");

/**
 * ردیف‌های انبارگردانی: هر کالای دامنه با شیوه‌ی شمارش، تعدادِ شمرده‌شده و — وقتی شمارش کور نیست — موجودیِ سیستم،
 * مغایرت و ارزشِ ریالیِ آن. دسکتاپ جدول، موبایل کارت. در شمارش، کالای بی‌اسکن عددِ دستی می‌گیرد؛ عددها تا زدنِ
 * «ثبت» در صفحه می‌مانند (`counts` از `useStocktakeCountDrafts`). در شمارش، بارکدهای اسکن‌شده‌ی هر کالا با «برداشتن»
 * زیرِ ردیف می‌آیند؛ پس از پایانِ شمارش بارکدهای مفقود/ناخواسته و نتیجه‌ی اعمال.
 */
export default function StocktakeLines({ stocktake, canCount, counts }) {
  const isMobile = useIsMobile();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState(LINE_FILTER.ALL);
  const [shown, setShown] = useState(PAGE);
  const blind = stocktake.isBlind;
  const allLines = stocktake.lines ?? [];
  const tabCounts = lineFilterCounts(allLines);

  const tabs = [
    { value: LINE_FILTER.ALL, label: "همه" },
    { value: LINE_FILTER.UNCOUNTED, label: "شمرده‌نشده" },
    // در شمارشِ کور مغایرت از سرور نمی‌آید.
    ...(blind ? [] : [{ value: LINE_FILTER.DIFFERENCE, label: "مغایرت‌دار" }]),
  ];
  const lines = visibleLines(allLines, { search, filter });
  const page = lines.slice(0, shown);
  const removeScan = useRemoveStocktakeScanMutation();
  const scans = canCount
    ? {
        onRemove: (barcode) => removeScan.mutate({ stocktakeId: stocktake.id, barcode }),
        pending: removeScan.isPending,
      }
    : null;

  return (
    <SectionCard title={`کالاها (${formatNumber(stocktake.lineCount)})`}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1 [&_label]:sr-only">
          <FilterSearchInput placeholder="نام یا کدِ کالا..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Tabs value={filter} onValueChange={setFilter}>
          <TabsList className="w-full sm:w-fit">
            {tabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} className="flex-1 gap-1.5 sm:flex-none">
                {tab.label}
                <span className="rounded-full bg-muted px-1.5 text-[11px] tabular-nums text-muted-foreground">
                  {formatNumber(tabCounts[tab.value])}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {lines.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
          کالایی با این فیلتر نیست.
        </p>
      ) : isMobile ? (
        <ul className="space-y-2">
          {page.map((line) => (
            <LineCard key={line.id} line={line} counts={canCount ? counts : null} blind={blind} scans={scans} />
          ))}
        </ul>
      ) : (
        <LinesTable lines={page} counts={canCount ? counts : null} blind={blind} scans={scans} />
      )}

      {lines.length > shown && (
        <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => setShown((n) => n + PAGE)}>
          نمایشِ {formatNumber(Math.min(PAGE, lines.length - shown))} کالای دیگر
        </Button>
      )}

      {canCount && (counts.pending > 0 || counts.saving) && <SaveBar counts={counts} />}
    </SectionCard>
  );
}

function LinesTable({ lines, counts, blind, scans }) {
  const columns = blind ? 3 : 6;
  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader className="bg-muted">
          <TableRow>
            <TableHead className="h-10 text-xs font-semibold text-muted-foreground">کالا</TableHead>
            <TableHead className="h-10 text-center text-xs font-semibold text-muted-foreground">شیوه</TableHead>
            {!blind && <TableHead className="h-10 text-center text-xs font-semibold text-muted-foreground">سیستم</TableHead>}
            <TableHead className="h-10 text-center text-xs font-semibold text-muted-foreground">شمرده‌شده</TableHead>
            {!blind && <TableHead className="h-10 text-center text-xs font-semibold text-muted-foreground">مغایرت</TableHead>}
            {!blind && <TableHead className="h-10 text-center text-xs font-semibold text-muted-foreground">ارزش (ریال)</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {lines.map((line) => {
            const details = lineDetails(line, { blind, scans });
            return [
              <TableRow
                key={line.id}
                className={cn("hover:bg-muted/40", details && "border-b-0", counts?.changedIds.has(line.productId) && "bg-warning/5")}
              >
                <TableCell className="max-w-72 py-2.5 whitespace-normal">
                  <ProductName line={line} />
                </TableCell>
                <TableCell className="text-center">
                  <ModeBadge line={line} />
                </TableCell>
                {!blind && <TableCell className="text-center tabular-nums">{formatNumber(line.systemQuantity)}</TableCell>}
                <TableCell className="text-center">
                  <CountedCell line={line} counts={counts} size="sm" />
                </TableCell>
                {!blind && (
                  <TableCell className="text-center">
                    <Difference value={line.difference} bold />
                  </TableCell>
                )}
                {!blind && (
                  <TableCell className="text-center">
                    <Difference value={line.differenceValue} />
                  </TableCell>
                )}
              </TableRow>,
              details && (
                <TableRow key={`${line.id}-details`} className="hover:bg-transparent">
                  <TableCell colSpan={columns} className="pt-0 pb-2.5 whitespace-normal">
                    {details}
                  </TableCell>
                </TableRow>
              ),
            ];
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function LineCard({ line, counts, blind, scans }) {
  const details = lineDetails(line, { blind, scans });
  const changed = counts?.changedIds.has(line.productId);
  return (
    <li className={cn("space-y-3 rounded-xl border border-border bg-card p-3", changed && "border-warning/60 bg-warning/5")}>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <ProductName line={line} />
        </div>
        <ModeBadge line={line} />
      </div>
      <dl className={cn("grid gap-2 rounded-lg bg-muted/40 p-2 text-center", blind ? "grid-cols-1" : "grid-cols-3")}>
        {!blind && <CardStat label="سیستم">{formatNumber(line.systemQuantity)}</CardStat>}
        <CardStat label="شمرده‌شده">
          <CountedCell line={line} counts={counts} />
        </CardStat>
        {!blind && (
          <CardStat label="مغایرت">
            <Difference value={line.difference} bold />
          </CardStat>
        )}
      </dl>
      {!blind && Number(line.differenceValue) !== 0 && line.differenceValue != null && (
        <p className="text-xs text-muted-foreground">
          ارزشِ مغایرت: <Difference value={line.differenceValue} /> ریال
        </p>
      )}
      {details}
    </li>
  );
}

function ProductName({ line }) {
  return (
    <>
      <p className="truncate text-sm font-medium">{line.productName}</p>
      <p className="truncate text-right font-mono text-xs text-muted-foreground" dir="ltr">
        {line.productCode}
      </p>
    </>
  );
}

function ModeBadge({ line }) {
  return (
    <StatusBadge tone={MODE_TONES[line.countMode]} size="sm">
      {STOCKTAKE_COUNT_MODE_LABELS[line.countMode]}
    </StatusBadge>
  );
}

function CardStat({ label, children }) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-1">
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium tabular-nums">{children}</dd>
    </div>
  );
}

function Difference({ value, bold = false }) {
  if (value == null) return <span className="text-muted-foreground">—</span>;
  return <span className={cn("tabular-nums", bold && "font-semibold", differenceTone(value))}>{signed(value)}</span>;
}

/**
 * شمرده‌شده: عددِ دستی (قابلِ ویرایش در شمارش، با `QuantityStepper`ِ مشترک)، یا تعدادِ اسکن‌ها. خانه‌ی خالی یعنی
 * شمرده‌نشده؛ صفر یعنی «شمردم، هیچ نبود».
 */
function CountedCell({ line, counts, size = "md" }) {
  if (counts && acceptsManualCount(line)) {
    return (
      <QuantityStepper
        size={size}
        value={counts.valueOf(line)}
        placeholder="—"
        onChange={(quantity) => counts.setCount(line.productId, quantity)}
      />
    );
  }
  if (line.countedQuantity == null) return <span className="text-muted-foreground">—</span>;
  return <span className="tabular-nums">{formatNumber(line.countedQuantity)}</span>;
}

/**
 * بارکدهای اسکن‌شده (فقط در شمارش، با «برداشتن»)، مفقود/ناخواسته، جابه‌جاشده‌ها و نتیجه‌ی اعمال؛ `null` وقتی چیزی
 * برای گفتن نیست. در شمارشِ کور فقط اسکن‌ها می‌آیند — بقیه از سرور نمی‌آید.
 *
 * @param scans `{ onRemove, pending }` وقتی برداشتنِ اسکن مجاز است، وگرنه `null`
 */
function lineDetails(line, { blind, scans }) {
  const scanned = scans ? (line.scannedBarcodes ?? []) : [];
  const missing = blind ? [] : (line.missingBarcodes ?? []);
  const unexpected = blind ? [] : (line.unexpectedBarcodes ?? []);
  const relocated = !blind && line.relocatedCount > 0;
  const applied = !blind && line.appliedMissing != null;
  if (!scanned.length && !missing.length && !unexpected.length && !relocated && !applied) return null;
  return (
    <div className="space-y-1 rounded-lg bg-muted/40 px-3 py-2 text-xs">
      {scanned.length > 0 && <ScannedBarcodes barcodes={scanned} onRemove={scans.onRemove} pending={scans.pending} />}
      {missing.length > 0 && <Barcodes label="مفقود (اسقاط می‌شود)" barcodes={missing} />}
      {relocated && (
        <p className="text-muted-foreground">
          {formatNumber(line.relocatedCount)} دانه از انبارِ دیگر این‌جا پیدا شد؛ فقط انبارش عوض می‌شود.
        </p>
      )}
      {unexpected.length > 0 && <Barcodes label="اسکن‌شده ولی بیرون از قفسه (فقط گزارش)" barcodes={unexpected} />}
      {applied && (
        <p className="text-muted-foreground">
          اعمال‌شده: {formatNumber(line.appliedMissing)} اسقاط، {formatNumber(line.appliedFound)} دانه‌ی تازه/پیداشده
        </p>
      )}
    </div>
  );
}

function Barcodes({ label, barcodes }) {
  return (
    <p className="flex flex-wrap items-baseline gap-1">
      <span className="text-muted-foreground">{label}:</span>
      {barcodes.map((barcode) => (
        <span key={barcode} className="rounded bg-background px-1 font-mono" dir="ltr">
          {barcode}
        </span>
      ))}
    </p>
  );
}

/** بارکدهای پیش از این‌که باز شوند جمع‌اند؛ کالای پرتعداد صدها دانه دارد. */
const SCANNED_PREVIEW = 6;

/** همه‌ی اسکن‌های این کالا در این انبارگردانی (هر کاربر، هر روز)، هر کدام با «برداشتن» (`RemoveStocktakeScan`). */
function ScannedBarcodes({ barcodes, onRemove, pending }) {
  const [open, setOpen] = useState(false);
  const shown = open ? barcodes : barcodes.slice(0, SCANNED_PREVIEW);
  return (
    <div className="space-y-1">
      <p className="text-muted-foreground">اسکن‌شده ({formatNumber(barcodes.length)}):</p>
      <ul className="flex flex-wrap gap-1">
        {shown.map((barcode) => (
          <li key={barcode} className="flex items-center gap-0.5 rounded bg-background ps-1">
            <span className="font-mono" dir="ltr">
              {barcode}
            </span>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              className="size-6"
              disabled={pending}
              aria-label={`برداشتنِ اسکنِ ${barcode}`}
              title="برداشتنِ اسکن"
              onClick={() => onRemove(barcode)}
            >
              <Undo2 className="size-3" />
            </Button>
          </li>
        ))}
      </ul>
      {barcodes.length > SCANNED_PREVIEW && (
        <Button type="button" variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => setOpen((value) => !value)}>
          {open ? "بستن" : `نمایشِ ${formatNumber(barcodes.length - SCANNED_PREVIEW)} اسکنِ دیگر`}
        </Button>
      )}
    </div>
  );
}

/** نوارِ «ثبت»: تعدادِ تغییرهای ثبت‌نشده، ثبت و دور ریختن؛ پایینِ صفحه می‌چسبد تا در فهرستِ بلند هم دیده شود. */
function SaveBar({ counts }) {
  return (
    <div className="sticky bottom-2 z-10 flex flex-wrap items-center gap-2 rounded-xl border border-warning/60 bg-card p-2.5 shadow-lg">
      <p className="min-w-0 flex-1 text-sm">
        {counts.saving
          ? `در حالِ ثبت؛ ${formatNumber(counts.pending)} کالا مانده`
          : `${formatNumber(counts.pending)} کالا شمرده شده و هنوز ثبت نشده`}
      </p>
      <Button type="button" size="sm" variant="outline" className="gap-1.5" disabled={counts.saving} onClick={counts.discard}>
        <X className="size-3.5" />
        انصراف
      </Button>
      <Button type="button" size="sm" className="gap-1.5" disabled={counts.saving} onClick={counts.save}>
        <Save className="size-3.5" />
        {counts.saving ? "در حالِ ثبت..." : "ثبتِ شمارش"}
      </Button>
    </div>
  );
}
