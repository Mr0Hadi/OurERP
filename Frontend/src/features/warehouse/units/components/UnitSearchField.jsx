import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Loader2, ScanBarcode, Search, X } from "lucide-react";

import { Input } from "@/shared/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";

const CameraScanner = lazy(
  () => import("@/features/warehouse/products/components/forms/CameraScanner"),
);

/** دو رفتارِ اسکن — کنارِ خودِ فیلد، تا کاربر همیشه بداند اسکن چه می‌کند. */
const SCAN_MODES = [
  { value: false, label: "باز کردن", hint: "اسکنِ هر دانه جزئیاتش را باز می‌کند" },
  { value: true, label: "افزودن به انتخاب", hint: "دانه‌ها را پشتِ سرِ هم اسکن کنید تا انتخاب شوند" },
];

/**
 * جست‌وجو و اسکن در یک فیلد. تایپ فهرست را فیلتر می‌کند (والد debounce
 * می‌کند)؛ Enter یا اسکنر (که مثلِ صفحه‌کلید می‌نویسد و Enter می‌زند) کد
 * را به `onScan` می‌دهد. دوربین برای تبلتِ بی‌اسکنر.
 */
export default function UnitSearchField({ value, onChange, onScan, isBusy, scanToSelect, onScanModeChange }) {
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [scanToSelect]);

  const submit = useCallback(
    (code) => {
      const trimmed = String(code ?? "").trim();
      if (trimmed) onScan(trimmed);
      inputRef.current?.focus();
    },
    [onScan],
  );

  // identityِ پایدار: `CameraScanner` با عوض شدنش دوربین را از نو باز می‌کند.
  const handleDetected = useCallback(
    (text) => {
      setIsCameraOpen(false);
      submit(text);
    },
    [submit],
  );

  const mode = SCAN_MODES.find((option) => option.value === scanToSelect);

  return (
    <div className="space-y-1.5">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit(value);
        }}
        className="relative"
      >
        <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground">
          {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </span>
        <Input
          ref={inputRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={
            scanToSelect ? "دانه‌ها را پشتِ سرِ هم اسکن کنید…" : "نام کالا، بارکد یا سریال…"
          }
          className="h-11 pr-9 pl-24 text-base sm:text-sm"
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="search"
        />
        <div className="absolute top-1/2 left-1.5 flex -translate-y-1/2 items-center gap-0.5">
          {value && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="پاک کردن جست‌وجو"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsCameraOpen(true)}
            className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
            title="اسکن با دوربین"
          >
            <ScanBarcode className="h-4 w-4" />
            <span className="hidden sm:inline">دوربین</span>
          </button>
        </div>
      </form>

      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>اسکن:</span>
        <div role="radiogroup" aria-label="رفتارِ اسکن" className="inline-flex rounded-md bg-muted p-0.5">
          {SCAN_MODES.map((option) => {
            const active = option.value === scanToSelect;
            return (
              <button
                key={option.label}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onScanModeChange(option.value)}
                className={`rounded px-2 py-0.5 transition-colors ${
                  active ? "bg-background font-medium text-foreground shadow-sm" : "hover:text-foreground"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
        <span className="hidden sm:inline">{mode?.hint}</span>
      </div>

      <Dialog open={isCameraOpen} onOpenChange={setIsCameraOpen}>
        <DialogContent dir="rtl" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>اسکن بارکد یا کد QR</DialogTitle>
          </DialogHeader>
          {isCameraOpen && (
            <Suspense
              fallback={
                <div className="flex aspect-video w-full items-center justify-center rounded-md bg-black text-sm text-white">
                  در حال آماده‌سازی دوربین…
                </div>
              }
            >
              <CameraScanner onDetected={handleDetected} />
            </Suspense>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
