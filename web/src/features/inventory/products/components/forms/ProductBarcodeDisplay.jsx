// src/features/inventory/products/components/forms/ProductBarcodeDisplay.jsx
import Barcode from "react-barcode";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "#/shared/components/ui/card";

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
            <Barcode
              value={value}
              width={1.5}
              height={60}
              fontSize={14}
              margin={5}
            />
          ) : (
            <div className="flex flex-col items-center text-muted-foreground">
              <span className="text-xs md:text-sm text-center">
                بارکد را در فیلد بالا وارد کنید
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
