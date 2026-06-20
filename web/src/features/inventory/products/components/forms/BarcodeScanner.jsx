// src/features/inventory/products/components/forms/BarcodeScanner.jsx
import { useState } from "react";
import { ScanBarcode } from "lucide-react";
import toast from "react-hot-toast";
import { QrReader } from "react-qr-reader";

import { Button } from "#/shared/components/ui/button";
import { Input } from "#/shared/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "#/shared/components/ui/dialog";

export default function BarcodeScanner({ value, onChange, ...inputProps }) {
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const handleScan = (result) => {
    if (result) {
      onChange(result.text);
      toast.success("بارکد با موفقیت اسکن شد");
      setIsScannerOpen(false);
    }
  };

  return (
    <div className="flex gap-2">
      <Input
        className="flex-1"
        type="number"
        
        placeholder="بارکد را وارد یا اسکن کنید"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        {...inputProps}
      />

      <Dialog open={isScannerOpen} onOpenChange={setIsScannerOpen}>
        <DialogTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="shrink-0"
            title="اسکن بارکد"
          >
            <ScanBarcode className="w-4 h-4" />
          </Button>
        </DialogTrigger>
        <DialogContent dir="rtl" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>اسکن بارکد با دوربین</DialogTitle>
          </DialogHeader>
          <div className="w-full aspect-square bg-black rounded-md overflow-hidden relative flex items-center justify-center">
            {isScannerOpen && (
              <QrReader
                constraints={{ facingMode: "environment" }}
                onResult={handleScan}
                className="w-full h-full"
              />
            )}
          </div>
          <p className="text-xs text-muted-foreground text-center mt-2">
            دوربین را مقابل بارکد قرار دهید تا به صورت خودکار خوانده شود.
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
