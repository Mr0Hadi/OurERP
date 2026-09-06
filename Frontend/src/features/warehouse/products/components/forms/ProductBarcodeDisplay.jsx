// src/features/warehouse/products/components/forms/ProductBarcodeDisplay.jsx
import { useId, useState } from "react";
import { QrCode } from "lucide-react";

import BarcodeGraphic from "@/shared/components/print/BarcodeGraphic";
import QrCodeGraphic from "@/shared/components/print/QrCodeGraphic";
import { Label } from "@/shared/components/ui/label";
import { Switch } from "@/shared/components/ui/switch";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";

/**
 * پیش‌نمایشِ بارکدِ سطحِ کالا (`Product.BarCode`).
 *
 * این همان بارکدی است که سرور ساخته؛ کاربر چیزی وارد نمی‌کند، پس تا
 * وقتی کالا ثبت نشده اینجا خالی است.
 *
 * سوییچِ بالای کارت فقط *نمایش* را عوض می‌کند، نه داده را: هر دو نماد
 * روی همان `value` ساخته می‌شوند و موقعِ اسکن یک رشته‌ی یکسان می‌دهند.
 * انتخاب بین این دو سلیقه‌ای نیست — بارکدِ خطی برای اسکنرِ لیزریِ انبار
 * است و QR برای دوربینِ موبایل که از زاویه‌ی بازتری می‌خواند.
 */
export default function ProductBarcodeDisplay({ value }) {
  const [showQr, setShowQr] = useState(false);
  const switchId = useId();

  return (
    <Card className="md:w-full">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-lg">{showQr ? "کد QR" : "بارکد"}</CardTitle>

        <div className="flex items-center gap-2">
          <Label
            htmlFor={switchId}
            className="flex cursor-pointer items-center gap-1 text-xs font-normal text-muted-foreground"
          >
            <QrCode className="h-4 w-4" />
            QR
          </Label>
          <Switch
            id={switchId}
            checked={showQr}
            onCheckedChange={setShowQr}
            aria-label="نمایش کد QR به‌جای بارکد"
          />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center gap-4">
        <div className="md:w-full mx-auto border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center overflow-hidden p-4">
          {value ? (
            showQr ? (
              <QrCodeGraphic value={value} preset="display" />
            ) : (
              <BarcodeGraphic value={value} preset="display" />
            )
          ) : (
            <div className="flex flex-col items-center text-muted-foreground">
              <span className="text-xs md:text-sm text-center">
                {showQr
                  ? "کد QR بعد از ثبت کالا توسط سرور ساخته می‌شود"
                  : "بارکد بعد از ثبت کالا توسط سرور ساخته می‌شود"}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
