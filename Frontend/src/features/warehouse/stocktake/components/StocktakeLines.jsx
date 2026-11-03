import { useEffect, useRef, useState } from "react";

import { Button } from "@/shared/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import SectionCard from "@/shared/components/forms/SectionCard";
import QuantityField from "@/shared/components/forms/QuantityField";
import FilterSearchInput from "@/shared/components/filters/FilterSearchInput";
import StatusBadge from "@/shared/components/status/StatusBadge";
import { STOCKTAKE_COUNT_MODE_LABELS, StocktakeCountModeEnum } from "@/shared/domain/enums/stocktake";
import { useIsMobile } from "@/shared/hooks/useIsMobile";
import { formatNumber } from "@/shared/lib/numberFormat";
import { toneText } from "@/shared/lib/tone";
import { cn } from "@/shared/lib/utils";
import { useCountStocktakeLineMutation } from "../services/mutations";
import { LINE_FILTER, acceptsManualCount, lineFilterCounts, visibleLines } from "../domain/stocktake";

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
 * مغایرت و ارزشِ ریالیِ آن. دسکتاپ جدول، موبایل کارت. در شمارش، کالای بی‌اسکن عددِ دستی می‌گیرد
 * (`CountStocktakeLine`). پس از پایانِ شمارش بارکدهای مفقود/ناخواسته و نتیجه‌ی اعمال زیرِ هر ردیف می‌آیند.
 */
export default function StocktakeLines({ stocktake, canCount }) {
  const isMobile = useIsMobile();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState(LINE_FILTER.ALL);
  const [shown, setShown] = useState(PAGE);
  const blind = stocktake.isBlind;
  const allLines = stocktake.lines ?? [];
  const counts = lineFilterCounts(allLines);

  const tabs = [
    { value: LINE_FILTER.ALL, label: "همه" },
    { value: LINE_FILTER.UNCOUNTED, label: "شمرده‌نشده" },
    // در شمارشِ کور مغایرت از سرور نمی‌آید.
    ...(blind ? [] : [{ value: LINE_FILTER.DIFFERENCE, label: "مغایرت‌دار" }]),
  ];
  const lines = visibleLines(allLines, { search, filter });
  const page = lines.slice(0, shown);

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
                  {formatNumber(counts[tab.value])}
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
            <LineCard key={line.id} line={line} stocktakeId={stocktake.id} blind={blind} canCount={canCount} />
          ))}
        </ul>
      ) : (
        <LinesTable lines={page} stocktakeId={stocktake.id} blind={blind} canCount={canCount} />
      )}

      {lines.length > shown && (
        <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => setShown((n) => n + PAGE)}>
          نمایشِ {formatNumber(Math.min(PAGE, lines.length - shown))} کالای دیگر
        </Button>
      )}
    </SectionCard>
  );
}

function LinesTable({ lines, stocktakeId, blind, canCount }) {
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
            const details = !blind && lineDetails(line);
            return [
              <TableRow key={line.id} className={cn("hover:bg-muted/40", details && "border-b-0")}>
                <TableCell className="max-w-72 py-2.5 whitespace-normal">
                  <ProductName line={line} />
                </TableCell>
                <TableCell className="text-center">
                  <ModeBadge line={line} />
                </TableCell>
                {!blind && <TableCell className="text-center tabular-nums">{formatNumber(line.systemQuantity)}</TableCell>}
                <TableCell className="text-center">
                  <CountedCell line={line} stocktakeId={stocktakeId} canCount={canCount} size="sm" />
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

function LineCard({ line, stocktakeId, blind, canCount }) {
  const details = !blind && lineDetails(line);
  return (
    <li className="space-y-3 rounded-xl border border-border bg-card p-3">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <ProductName line={line} />
        </div>
        <ModeBadge line={line} />
      </div>
      <dl className={cn("grid gap-2 rounded-lg bg-muted/40 p-2 text-center", blind ? "grid-cols-1" : "grid-cols-3")}>
        {!blind && <CardStat label="سیستم">{formatNumber(line.systemQuantity)}</CardStat>}
        <CardStat label="شمرده‌شده">
          <CountedCell line={line} stocktakeId={stocktakeId} canCount={canCount} />
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

/** شمرده‌شده: عددِ دستی (قابلِ ویرایش در شمارش)، یا تعدادِ اسکن‌ها. */
function CountedCell({ line, stocktakeId, canCount, size = "md" }) {
  if (canCount && acceptsManualCount(line)) {
    return <ManualCountInput line={line} stocktakeId={stocktakeId} size={size} />;
  }
  if (line.countedQuantity == null) return <span className="text-muted-foreground">—</span>;
  return <span className="tabular-nums">{formatNumber(line.countedQuantity)}</span>;
}

/** بارکدهای مفقود/ناخواسته، جابه‌جاشده‌ها و نتیجه‌ی اعمال؛ `null` وقتی چیزی برای گفتن نیست. */
function lineDetails(line) {
  const missing = line.missingBarcodes ?? [];
  const unexpected = line.unexpectedBarcodes ?? [];
  const applied = line.appliedMissing != null;
  if (!missing.length && !unexpected.length && !(line.relocatedCount > 0) && !applied) return null;
  return (
    <div className="space-y-1 rounded-lg bg-muted/40 px-3 py-2 text-xs">
      {missing.length > 0 && <Barcodes label="مفقود (اسقاط می‌شود)" barcodes={missing} />}
      {line.relocatedCount > 0 && (
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

/** مکث پس از آخرین کلیکِ +/− تا ثبت؛ چند کلیکِ پشتِ‌سرهم یک درخواست می‌شوند. */
const STEP_SAVE_DELAY = 700;

/**
 * عددِ دستی با `QuantityField` (همان فیلدِ تعدادِ فرمِ خرید/فروش). تایپ با Enter یا ترکِ فیلد ثبت می‌شود و +/− خودشان
 * پس از مکثی کوتاه. خالی کردنِ فیلد شمارش را پاک می‌کند. ثبتِ تایپ فقط از `onBlur` است و Enter فیلد را blur می‌کند —
 * وگرنه Enter یک بار ثبت می‌کرد و blurِ بعدی بارِ دوم. تا درخواستی در راه است، ثبتِ بعدی پس از پاسخ می‌رود.
 */
function ManualCountInput({ line, stocktakeId, size }) {
  const count = useCountStocktakeLineMutation();
  const server = line.manualCount ?? null;
  // پیش‌نویسِ کاربر تا وقتی سرور همان را پذیرفته؛ `null` یعنی همان عددِ سرور نشان داده شود.
  const [draft, setDraftState] = useState(null);
  const draftRef = useRef(null);
  const timer = useRef(null);
  const queued = useRef(false);
  // ref، نه `count.isPending`: تایمر تابعِ رندرِ قبلی را صدا می‌زند و آن مقدار کهنه است.
  const inFlight = useRef(false);
  // آخرین عددی که سرور پذیرفت؛ ref چون ثبتِ صف‌شده از تابعِ رندرِ قبلی اجرا می‌شود و `server`ِ آن کهنه است.
  const confirmed = useRef(server);

  useEffect(() => () => clearTimeout(timer.current), []);

  const setDraft = (next) => {
    draftRef.current = next;
    setDraftState(next);
  };

  const commit = () => {
    clearTimeout(timer.current);
    if (draftRef.current == null) return;
    const trimmed = draftRef.current.trim();
    const quantity = trimmed === "" ? null : Number(trimmed);
    if (quantity !== null && (!Number.isInteger(quantity) || quantity < 0)) return;
    if (inFlight.current) {
      queued.current = true;
      return;
    }
    if (quantity === confirmed.current) return setDraft(null);
    inFlight.current = true;
    count.mutate(
      { stocktakeId, productId: line.productId, quantity },
      {
        onSuccess: () => {
          confirmed.current = quantity;
          // اگر در این فاصله عددِ دیگری زده نشده، پیش‌نویس تمام است و عددِ سرور نشان داده می‌شود.
          if (!queued.current && draftRef.current === trimmed) setDraft(null);
        },
        onError: () => setDraft(null),
        onSettled: () => {
          inFlight.current = false;
          if (!queued.current) return;
          queued.current = false;
          commit();
        },
      },
    );
  };

  const handleChange = (next) => {
    setDraft(String(next));
    // عددِ دکمه‌ها (نه متنِ تایپ‌شده) پس از مکث ثبت می‌شود.
    if (typeof next === "number") {
      clearTimeout(timer.current);
      timer.current = setTimeout(commit, STEP_SAVE_DELAY);
    }
  };

  const value = draft ?? (server == null ? "" : String(server));

  return (
    <QuantityField
      min={0}
      size={size}
      value={value}
      onChange={handleChange}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          e.currentTarget.blur();
        }
      }}
      placeholder="—"
      aria-label={`تعدادِ شمرده‌شده‌ی ${line.productName}`}
      className={cn("mx-auto", size === "sm" ? "w-28" : "w-full max-w-36", count.isPending && "opacity-70")}
    />
  );
}
