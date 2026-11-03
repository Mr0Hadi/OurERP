import { useState } from "react";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import SectionCard from "@/shared/components/forms/SectionCard";
import StatusChoice from "@/shared/components/forms/StatusChoice";
import FilterSearchInput from "@/shared/components/filters/FilterSearchInput";
import StatusBadge from "@/shared/components/status/StatusBadge";
import { STOCKTAKE_COUNT_MODE_LABELS, StocktakeCountModeEnum } from "@/shared/domain/enums/stocktake";
import { formatNumber } from "@/shared/lib/numberFormat";
import { toneText } from "@/shared/lib/tone";
import { cn } from "@/shared/lib/utils";
import { useCountStocktakeLineMutation } from "../services/mutations";
import { LINE_FILTER, acceptsManualCount, visibleLines } from "../domain/stocktake";

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
 * مغایرت و ارزشِ ریالیِ آن. در شمارش، کالای بی‌اسکن عددِ دستی می‌گیرد (`CountStocktakeLine`). پس از پایانِ شمارش
 * بارکدهای مفقود/ناخواسته‌ی هر ردیف دیده می‌شوند.
 */
export default function StocktakeLines({ stocktake, canCount }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState(LINE_FILTER.ALL);
  const [shown, setShown] = useState(PAGE);
  const blind = stocktake.isBlind;

  const filterOptions = [
    { value: LINE_FILTER.ALL, label: "همه" },
    { value: LINE_FILTER.UNCOUNTED, label: "شمرده‌نشده" },
    ...(blind ? [] : [{ value: LINE_FILTER.DIFFERENCE, label: "مغایرت‌دار" }]),
  ];
  const lines = visibleLines(stocktake.lines ?? [], { search, filter });

  return (
    <SectionCard title={`کالاها (${formatNumber(stocktake.lineCount)})`}>
      <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
        <FilterSearchInput placeholder="نام یا کدِ کالا..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <StatusChoice label="نمایش" options={filterOptions} value={filter} onChange={setFilter} />
      </div>

      {lines.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">کالایی با این فیلتر نیست.</p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {lines.slice(0, shown).map((line) => (
            <LineRow key={line.id} line={line} stocktakeId={stocktake.id} blind={blind} canCount={canCount} />
          ))}
        </ul>
      )}
      {lines.length > shown && (
        <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => setShown((n) => n + PAGE)}>
          نمایشِ {formatNumber(Math.min(PAGE, lines.length - shown))} کالای دیگر
        </Button>
      )}
    </SectionCard>
  );
}

function LineRow({ line, stocktakeId, blind, canCount }) {
  const editable = canCount && acceptsManualCount(line);
  const missing = line.missingBarcodes ?? [];
  const unexpected = line.unexpectedBarcodes ?? [];

  return (
    <li className="space-y-2 px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="min-w-0 flex-1 basis-48">
          <p className="truncate text-sm font-medium">{line.productName}</p>
          <p className="font-mono text-xs text-muted-foreground" dir="ltr">
            {line.productCode}
          </p>
        </div>
        <StatusBadge tone={MODE_TONES[line.countMode]} size="sm">
          {STOCKTAKE_COUNT_MODE_LABELS[line.countMode]}
        </StatusBadge>
        <dl className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          {!blind && <Stat label="سیستم">{formatNumber(line.systemQuantity)}</Stat>}
          {line.countMode === StocktakeCountModeEnum.SCAN && <Stat label="اسکن">{formatNumber(line.scannedCount)}</Stat>}
          {editable ? (
            <ManualCountInput key={line.manualCount ?? "empty"} line={line} stocktakeId={stocktakeId} />
          ) : (
            <Stat label="شمرده">{line.countedQuantity == null ? "—" : formatNumber(line.countedQuantity)}</Stat>
          )}
          {!blind && line.difference != null && (
            <Stat label="مغایرت">
              <span className={cn("font-semibold", differenceTone(line.difference))}>{signed(line.difference)}</span>
            </Stat>
          )}
          {!blind && Number(line.differenceValue) !== 0 && line.differenceValue != null && (
            <Stat label="ارزش (ریال)">
              <span className={differenceTone(line.differenceValue)}>{signed(line.differenceValue)}</span>
            </Stat>
          )}
        </dl>
      </div>
      {!blind && (missing.length > 0 || unexpected.length > 0 || line.relocatedCount > 0) && (
        <div className="space-y-1 text-xs">
          {missing.length > 0 && <Barcodes label="مفقود (اسقاط می‌شود)" barcodes={missing} />}
          {line.relocatedCount > 0 && (
            <p className="text-muted-foreground">{formatNumber(line.relocatedCount)} دانه از انبارِ دیگر این‌جا پیدا شد؛ فقط انبارش عوض می‌شود.</p>
          )}
          {unexpected.length > 0 && <Barcodes label="اسکن‌شده ولی بیرون از قفسه (فقط گزارش)" barcodes={unexpected} />}
          {line.appliedMissing != null && (
            <p className="text-muted-foreground">
              اعمال‌شده: {formatNumber(line.appliedMissing)} اسقاط، {formatNumber(line.appliedFound)} دانه‌ی تازه/پیداشده
            </p>
          )}
        </div>
      )}
    </li>
  );
}

function Stat({ label, children }) {
  return (
    <div className="flex items-baseline gap-1">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium tabular-nums">{children}</dd>
    </div>
  );
}

function Barcodes({ label, barcodes }) {
  return (
    <p className="flex flex-wrap items-baseline gap-1">
      <span className="text-muted-foreground">{label}:</span>
      {barcodes.map((barcode) => (
        <span key={barcode} className="rounded bg-muted px-1 font-mono" dir="ltr">
          {barcode}
        </span>
      ))}
    </p>
  );
}

/** عددِ دستی؛ با Enter یا ترکِ فیلد ثبت می‌شود و خالی کردنش شمارش را پاک می‌کند. */
function ManualCountInput({ line, stocktakeId }) {
  const count = useCountStocktakeLineMutation();
  const [value, setValue] = useState(line.manualCount == null ? "" : String(line.manualCount));

  const commit = () => {
    const trimmed = value.trim();
    const quantity = trimmed === "" ? null : Number(trimmed);
    if (quantity !== null && (!Number.isInteger(quantity) || quantity < 0)) return;
    if (quantity === (line.manualCount ?? null)) return;
    count.mutate({ stocktakeId, productId: line.productId, quantity });
  };

  return (
    <label className="flex items-center gap-1.5">
      <span className="text-muted-foreground">شمرده</span>
      <Input
        type="number"
        inputMode="numeric"
        min={0}
        step={1}
        dir="ltr"
        value={value}
        disabled={count.isPending}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          }
        }}
        placeholder="—"
        aria-label={`تعدادِ شمرده‌شده‌ی ${line.productName}`}
        className="h-8 w-20 text-center tabular-nums"
      />
    </label>
  );
}
