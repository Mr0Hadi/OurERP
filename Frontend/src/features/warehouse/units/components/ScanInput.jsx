import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { ScanBarcode, Search, X } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";

const CameraScanner = lazy(
  () => import("@/features/warehouse/products/components/forms/CameraScanner"),
);

/**
 * ورودیِ اسکن: اسکنرِ دستی (که مثل صفحه‌کلید کد را می‌نویسد و Enter
 * می‌زند) یا دوربین برای تبلتِ بی‌اسکنر.
 *
 * `continuous` برای اسکنِ پیاپی است: بعد از هر ثبت ورودی خالی می‌شود و
 * فوکوس می‌ماند تا اسکنِ بعدی بی‌کلیک ادامه پیدا کند.
 */
export default function ScanInput({
  onSubmit,
  continuous = false,
  placeholder,
  submitLabel = "یافتن",
  isBusy = false,
  autoFocusKey,
}) {
  const [value, setValue] = useState("");
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [autoFocusKey]);

  const submit = useCallback(
    (code) => {
      const trimmed = String(code ?? "").trim();
      if (!trimmed) return;
      onSubmit(trimmed);
      setValue(continuous ? "" : trimmed);
      inputRef.current?.focus();
    },
    [onSubmit, continuous],
  );

  // پایداریِ این callback شرطِ سرعتِ اسکنر است: `CameraScanner` با عوض
  // شدنِ identityِ آن دوربین را از نو باز می‌کند.
  const handleDetected = useCallback(
    (text) => {
      setIsCameraOpen(false);
      submit(text);
    },
    [submit],
  );

  return (
    <>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit(value);
        }}
        className="flex items-center gap-2"
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            className="h-11 pr-9 font-mono text-base"
            autoComplete="off"
            spellCheck={false}
          />
          {value ? (
            <button
              type="button"
              onClick={() => setValue("")}
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted"
              aria-label="پاک کردن"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        <Button
          type="button"
          variant="outline"
          size="lg"
          className="h-11 shrink-0 px-3"
          onClick={() => setIsCameraOpen(true)}
          title="اسکن با دوربین"
          aria-label="اسکن با دوربین"
        >
          <ScanBarcode className="h-5 w-5" />
        </Button>

        <Button type="submit" size="lg" className="h-11 shrink-0" disabled={!value.trim() || isBusy}>
          {isBusy ? "…" : submitLabel}
        </Button>
      </form>

      <Dialog open={isCameraOpen} onOpenChange={setIsCameraOpen}>
        <DialogContent dir="rtl" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>اسکن بارکد یا کد QR</DialogTitle>
          </DialogHeader>
          {isCameraOpen ? (
            <Suspense
              fallback={
                <div className="flex aspect-video w-full items-center justify-center rounded-md bg-black text-sm text-white">
                  در حال آماده‌سازی دوربین...
                </div>
              }
            >
              <CameraScanner onDetected={handleDetected} />
            </Suspense>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
