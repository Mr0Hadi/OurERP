// src/features/warehouse/units/components/UnitScanBar.jsx
import { lazy, Suspense, useEffect, useRef, useState } from "react";
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
 * نوار اسکن، همیشه بالای صفحه.
 *
 * اسکنر دستیِ انبار مثل صفحه‌کلید عمل می‌کند: کد را می‌نویسد و Enter
 * می‌زند — پس یک input ساده با submit دقیقاً همان چیزی است که لازم
 * است، نه فیلترِ تدریجیِ جدول. دوربین هم برای تبلتِ بدون اسکنر هست.
 *
 * توجه: BarcodeScanner موجود در ماژول کالاها اینجا قابل استفاده نیست،
 * چون ورودی‌اش هر چیز غیرعددی را حذف می‌کند و کدهای واحد (U-...) را
 * خراب می‌کند؛ فقط از خودِ CameraScanner استفاده می‌کنیم.
 */
export default function UnitScanBar({ onScan, notFoundCode, isSearching }) {
  const [value, setValue] = useState("");
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const submit = (code) => {
    const trimmed = String(code ?? "").trim();
    if (!trimmed) return;
    onScan(trimmed);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    submit(value);
  };

  return (
    <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="بارکد واحد را اسکن یا وارد کنید…"
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
        >
          <ScanBarcode className="h-5 w-5" />
        </Button>

        <Button
          type="submit"
          size="lg"
          className="h-11 shrink-0"
          disabled={!value.trim() || isSearching}
        >
          {isSearching ? "…" : "یافتن"}
        </Button>
      </form>

      {notFoundCode ? (
        <p className="mt-2 text-sm text-destructive">
          واحدی با کد «<span className="font-mono">{notFoundCode}</span>» پیدا
          نشد.
        </p>
      ) : null}

      <Dialog open={isCameraOpen} onOpenChange={setIsCameraOpen}>
        <DialogContent dir="rtl" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>اسکن بارکد واحد</DialogTitle>
          </DialogHeader>

          {isCameraOpen ? (
            <Suspense
              fallback={
                <div className="flex aspect-video w-full items-center justify-center rounded-md bg-black text-sm text-white">
                  در حال آماده‌سازی دوربین...
                </div>
              }
            >
              <CameraScanner
                onDetected={(text) => {
                  setIsCameraOpen(false);
                  setValue(text);
                  submit(text);
                }}
              />
            </Suspense>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
