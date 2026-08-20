import { lazy, Suspense, useState } from "react";
import { ScanBarcode } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog";


const CameraScanner = lazy(() => import("./CameraScanner"));

export default function BarcodeScanner({ value, onChange, action, ...inputProps }) {
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  return (
    <div className="flex gap-2">
      <Input
        className="flex-1"
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        placeholder="بارکد را وارد یا اسکن کنید"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, ""))}
        {...inputProps}
      />

      <Dialog open={isScannerOpen} onOpenChange={setIsScannerOpen}>
        <DialogTrigger asChild>
          <Button type="button" variant="outline" size="icon" className="shrink-0" title="اسکن بارکد">
            <ScanBarcode className="w-4 h-4" />
          </Button>
        </DialogTrigger>

        <DialogContent dir="rtl" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>اسکن بارکد با دوربین</DialogTitle>
          </DialogHeader>

          {isScannerOpen && (
            <Suspense
              fallback={
                <div className="w-full aspect-video bg-black rounded-md flex items-center justify-center text-white text-sm">
                  در حال آماده‌سازی دوربین...
                </div>
              }
            >
              <CameraScanner
                onDetected={(text) => {
                  onChange(text);
                  setIsScannerOpen(false);
                }}
              />
            </Suspense>
          )}

          <p className="text-xs text-muted-foreground text-center mt-2">
            دوربین را مقابل بارکد قرار دهید تا به صورت خودکار خوانده شود.
          </p>
        </DialogContent>
      </Dialog>

      {action}
    </div>
  );
}