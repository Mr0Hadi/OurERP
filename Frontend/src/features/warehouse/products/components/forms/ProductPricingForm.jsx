// src/features/warehouse/products/components/forms/ProductPricingForm.jsx
import { Controller, useWatch } from "react-hook-form";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { PriceInput } from "@/shared/components/ui/price-input";
import { numberToPersianWords } from "@/shared/lib/number-to-persian-words";

function PriceWords({ value }) {
  if (value === "" || value == null || Number(value) === 0) return null;
  return (
    <p className="text-xs text-muted-foreground">
      {numberToPersianWords(Number(value) / 10, { suffix: "تومان" })}
    </p>
  );
}

export default function ProductPricingForm({ register, control }) {
  const purchasePrice = useWatch({ control, name: "purchasePrice" });
  const sellPrice1 = useWatch({ control, name: "sellPrice1" });
  const sellPrice2 = useWatch({ control, name: "sellPrice2" });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">موجودی و قیمت‌گذاری</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="initialStock">موجودی اولیه</Label>
          <Input
            type="number"
            id="initialStock"
            {...register("initialStock")}
            min="0"
            placeholder="0"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="lowStockThreshold">آستانه هشدار کمبود موجودی</Label>
          <Input
            type="number"
            id="lowStockThreshold"
            {...register("lowStockThreshold")}
            min="0"
            placeholder="مثال: 10"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="vat">مالیات بر ارزش افزوده (درصد %)</Label>
          <Input
            type="number"
            id="vat"
            {...register("vat")}
            min="0"
            max="100"
            placeholder="0"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="purchasePrice">قیمت خرید (ریال)</Label>
          <Controller
            name="purchasePrice"
            control={control}
            render={({ field }) => (
              <PriceInput
                id="purchasePrice"
                min={0}
                value={field.value === "" || field.value == null ? null : Number(field.value)}
                onValueChange={(next) => field.onChange(next ?? "")}
              />
            )}
          />
          <PriceWords value={purchasePrice} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="sellPrice1">قیمت فروش اول (ریال)</Label>
          <Controller
            name="sellPrice1"
            control={control}
            render={({ field }) => (
              <PriceInput
                id="sellPrice1"
                min={0}
                value={field.value === "" || field.value == null ? null : Number(field.value)}
                onValueChange={(next) => field.onChange(next ?? "")}
              />
            )}
          />
          <PriceWords value={sellPrice1} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="sellPrice2">قیمت فروش دوم (همکار/عمده)</Label>
          <Controller
            name="sellPrice2"
            control={control}
            render={({ field }) => (
              <PriceInput
                id="sellPrice2"
                min={0}
                value={field.value === "" || field.value == null ? null : Number(field.value)}
                onValueChange={(next) => field.onChange(next ?? "")}
              />
            )}
          />
          <PriceWords value={sellPrice2} />
        </div>
      </CardContent>
    </Card>
  );
}