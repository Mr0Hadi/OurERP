// src/features/warehouse/products/components/forms/ProductBarcodeDisplay.jsx
import BarcodeGraphic from "@/shared/components/print/BarcodeGraphic";
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
 */
export default function ProductBarcodeDisplay({ value }) {
  return (
    <Card className="md:w-full">
      <CardHeader>
        <CardTitle className="text-lg text-center md:text-right">
          بارکد
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center gap-4">
        <div className="md:w-full mx-auto border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center overflow-hidden p-4">
          {value ? (
            <BarcodeGraphic value={value} preset="display" />
          ) : (
            <div className="flex flex-col items-center text-muted-foreground">
              <span className="text-xs md:text-sm text-center">
                بارکد بعد از ثبت کالا توسط سرور ساخته می‌شود
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
