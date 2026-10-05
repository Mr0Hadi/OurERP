import { useEffect, useRef } from "react";
import { Loader2, Search, X } from "lucide-react";

import { Input } from "@/shared/components/ui/input";
import CameraScanButton from "@/shared/components/barcode/CameraScanButton";

/** دو رفتارِ اسکن — کنارِ خودِ فیلد، تا کاربر همیشه بداند اسکن چه می‌کند. */
const SCAN_MODES = [
  { value: false, label: "باز کردن", hint: "اسکنِ هر دانه جزئیاتش را باز می‌کند" },
  { value: true, label: "افزودن به انتخاب", hint: "دانه‌ها را پشتِ سرِ هم اسکن کنید تا انتخاب شوند" },
];

/**
 * جست‌وجو و اسکن در یک فیلد. تایپ فهرست را فیلتر می‌کند (والد debounce
 * می‌کند)؛ Enter یا اسکنر (که مثلِ صفحه‌کلید می‌نویسد و Enter می‌زند) کد
 * را به `onScan` می‌دهد. دوربین برای تبلتِ بی‌اسکنر (`CameraScanButton`).
 */
export default function UnitSearchField({ value, onChange, onScan, isBusy, scanToSelect, onScanModeChange }) {
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [scanToSelect]);

  const submit = (code) => {
    const trimmed = String(code ?? "").trim();
    if (trimmed) onScan(trimmed);
    inputRef.current?.focus();
  };

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
          <CameraScanButton
            onDetected={submit}
            variant="ghost"
            size="sm"
            className="h-8 gap-1 px-2 text-xs text-muted-foreground"
          >
            <span className="hidden sm:inline">دوربین</span>
          </CameraScanButton>
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
    </div>
  );
}
