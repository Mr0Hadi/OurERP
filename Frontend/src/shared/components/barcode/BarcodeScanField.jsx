import { lazy, Suspense, useRef, useState } from "react";
import { ScanBarcode } from "lucide-react";

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
 * فیلد اسکن بارکد — قابل‌جاسازی در هر فرمی که باید با یک اسکن، خودکار
 * چیزی را پیدا کند؛ خودِ منطقِ «پیدا کردن و انتخاب» به عهده‌ی فراخوان
 * است (onScan).
 *
 * اسکنر دستیِ انبار مثل صفحه‌کلید عمل می‌کند: کد را می‌نویسد و Enter
 * می‌زند — پس گوش‌دادن به کلید Enter روی خودِ input دقیقاً همان چیزی
 * است که برای اسکنِ پشتِ‌سرهم لازم است. دوربین هم برای دستگاه‌های
 * بدون اسکنر (موبایل/تبلت) است.
 *
 * عمداً از تگ <form> استفاده نشده: این کامپوننت معمولاً داخلِ فرمِ
 * بزرگ‌ترِ صفحه (ثبت فروش/خرید) جاسازی می‌شود و تودرتو کردنِ <form>
 * در HTML نامعتبر است و submit را می‌شکند.
 *
 * این همان الگویی است که UnitScanBar برای اسکن واحدها دارد، اینجا به
 * شکلِ یک فیلدِ ساده و مشترک بیرون کشیده شده تا در فیلترِ لیست کالاها
 * و همه‌ی جاهایی که کالا برای افزودن انتخاب می‌شود (خرید، فروش،
 * مرجوعی) یکسان استفاده شود.
 */
export default function BarcodeScanField({
  onScan,
  placeholder = "اسکن بارکد کالا...",
  className = "",
  inputClassName = "",
}) {
  const [value, setValue] = useState("");
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const inputRef = useRef(null);

  const submit = (code) => {
    const trimmed = String(code ?? "").trim();
    if (!trimmed) return;
    onScan(trimmed);
    setValue("");
    inputRef.current?.focus();
  };

  const handleKeyDown = (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    submit(value);
  };

  return (
    <div className={`flex gap-2 ${className}`}>
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`flex-1 font-mono input-rtl-placeholder ${inputClassName}`}
        autoComplete="off"
        spellCheck={false}
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="shrink-0"
        onClick={() => setIsCameraOpen(true)}
        title="اسکن با دوربین"
      >
        <ScanBarcode className="h-4 w-4" />
      </Button>

      <Dialog open={isCameraOpen} onOpenChange={setIsCameraOpen}>
        <DialogContent dir="rtl" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>اسکن بارکد</DialogTitle>
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
