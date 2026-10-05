import { lazy, Suspense, useCallback, useLayoutEffect, useRef, useState } from "react";
import { ScanBarcode } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";

const CameraScanner = lazy(
  () => import("./CameraScanner"),
);

/**
 * دکمه‌ی «اسکن با دوربین» برای دستگاه‌های بی‌اسکنر (موبایل/تبلت): پنجره‌ی
 * دوربین را باز می‌کند و کدِ خوانده‌شده را به `onDetected` می‌دهد. دوربین هم
 * بارکد و هم QR را می‌خواند.
 *
 * callbackِ داده‌شده به `CameraScanner` پایدار است (با ref): آن کامپوننت با
 * عوض شدنِ identityِ آن دوربین را از نو باز می‌کند.
 *
 * `children` متنِ کنارِ آیکن است (مثلاً «دوربین» داخلِ فیلدِ جست‌وجو).
 */
export default function CameraScanButton({
  onDetected,
  className,
  size = "icon",
  variant = "outline",
  children,
}) {
  const [open, setOpen] = useState(false);
  const onDetectedRef = useRef(onDetected);
  useLayoutEffect(() => {
    onDetectedRef.current = onDetected;
  });
  const handleDetected = useCallback((text) => {
    setOpen(false);
    onDetectedRef.current(text);
  }, []);

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        onClick={() => setOpen(true)}
        title="اسکن با دوربین"
        aria-label="اسکن با دوربین"
      >
        <ScanBarcode className="size-4" />
        {children}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>اسکن بارکد یا کد QR</DialogTitle>
          </DialogHeader>
          {open && (
            <Suspense
              fallback={
                <div className="flex aspect-video w-full items-center justify-center rounded-md bg-black text-sm text-white">
                  در حال آماده‌سازی دوربین...
                </div>
              }
            >
              <CameraScanner onDetected={handleDetected} />
            </Suspense>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
