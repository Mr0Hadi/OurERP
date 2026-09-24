import { ListPlus, Search } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { BarcodeReferenceKindEnum } from "@/shared/domain/enums/barcodeReferenceKind";

import { SCAN_MODES } from "../domain/unitVocabulary";
import ScanInput from "./ScanInput";

const MODE_OPTIONS = [
  { value: SCAN_MODES.OPEN, label: "باز کردن دانه", icon: Search },
  { value: SCAN_MODES.SELECT, label: "افزودن به انتخاب", icon: ListPlus },
];

/**
 * نوارِ اسکن، همیشه بالای صفحه — با دو حالت:
 *  - **باز کردن:** هر اسکن جزئیاتِ همان دانه را باز می‌کند.
 *  - **افزودن به انتخاب:** اسکنِ پیاپی؛ هر دانه به انتخاب اضافه می‌شود. برای
 *    «برچسبِ این ده تا افتاده» یا «این‌ها را با هم قرنطینه کن».
 */
export default function UnitScanBar({
  mode,
  onModeChange,
  onScan,
  scanMiss,
  lastAdded,
  isSearching,
  onGoToProduct,
}) {
  const selecting = mode === SCAN_MODES.SELECT;

  return (
    <div className="space-y-2 rounded-xl border border-border bg-card p-3 shadow-sm">
      <div className="flex flex-wrap items-center gap-1" role="radiogroup" aria-label="حالت اسکن">
        {MODE_OPTIONS.map((option) => {
          const Icon = option.icon;
          const active = option.value === mode;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onModeChange(option.value)}
              className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs transition-colors ${
                active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {option.label}
            </button>
          );
        })}
      </div>

      <ScanInput
        onSubmit={onScan}
        continuous={selecting}
        autoFocusKey={mode}
        isBusy={isSearching}
        submitLabel={selecting ? "افزودن" : "یافتن"}
        placeholder={
          selecting
            ? "دانه‌ها را پشتِ سرِ هم اسکن کنید…"
            : "بارکد یا کد QR دانه را اسکن یا وارد کنید…"
        }
      />

      {selecting && lastAdded && (
        <p className="text-xs text-muted-foreground" aria-live="polite">
          {lastAdded.duplicate ? "قبلاً انتخاب شده بود: " : "افزوده شد: "}
          <span className="text-foreground">{lastAdded.unit.productName}</span>{" "}
          <span className="font-mono" dir="ltr">
            {lastAdded.unit.barcode}
          </span>
        </p>
      )}

      {scanMiss?.kind === BarcodeReferenceKindEnum.PRODUCT ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-amber-50 p-2 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          <span>این بارکدِ خودِ کالای «{scanMiss.product.name}» است، نه یک دانه.</span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="ms-auto"
            onClick={() => onGoToProduct(scanMiss.product)}
          >
            نمایش دانه‌های این کالا
          </Button>
        </div>
      ) : null}

      {scanMiss?.kind === BarcodeReferenceKindEnum.UNKNOWN ? (
        <p className="text-sm text-destructive">
          هیچ دانه یا کالایی با کد «<span className="font-mono">{scanMiss.code}</span>» پیدا نشد.
        </p>
      ) : null}
    </div>
  );
}
