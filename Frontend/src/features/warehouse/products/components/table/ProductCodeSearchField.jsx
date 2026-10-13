import { useRef } from "react";
import { Loader2, Search, X } from "lucide-react";

import { Input } from "@/shared/components/ui/input";
import CameraScanButton from "@/shared/components/barcode/CameraScanButton";

/**
 * جست‌وجوی کالا با کد در یک فیلد (مثلِ فیلدِ صفحه‌ی دانه‌ها). تایپ فهرست را
 * فیلتر می‌کند (`onChange`؛ والد debounce می‌کند). Enter یا اسکنر (که مثلِ
 * صفحه‌کلید می‌نویسد و Enter می‌زند) و دوربین کد را به `onScan` می‌دهند.
 */
export default function ProductCodeSearchField({ value, onChange, onScan, isBusy }) {
  const inputRef = useRef(null);

  const submit = (code) => {
    const trimmed = String(code ?? "").trim();
    if (trimmed) onScan(trimmed);
    inputRef.current?.focus();
  };

  return (
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
        placeholder="کد یا بارکد کالا — کامل: جزئیات، نیمه‌کاره: کالاهای مشابه…"
        className="h-11 pr-9 pl-24 font-mono text-base placeholder:font-sans sm:text-sm"
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
  );
}
