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
import { Checkbox } from "@/shared/components/ui/checkbox";
import { numberToPersianWords } from "@/shared/lib/numberToPersianWords";

function PriceWords({ value }) {
  if (value === "" || value == null || Number(value) === 0) return null;
  return (
    <p className="text-xs text-muted-foreground">
      {numberToPersianWords(Number(value) / 10, { suffix: "تومان" })}
    </p>
  );
}

export default function ProductPricingForm({ register, control, errors = {} }) {
  const purchasePrice = useWatch({ control, name: "purchasePrice" });
  const sellPrice1 = useWatch({ control, name: "sellPrice1" });
  const sellPrice2 = useWatch({ control, name: "sellPrice2" });
  const taxExempt = useWatch({ control, name: "taxExempt" });

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

        {/* سرور مالیاتِ هر قلمِ فاکتور را از همین دو فیلد حساب می‌کند؛ کالای
            معاف صفر مالیات می‌گیرد. فاکتورهای صادرشده نرخِ خودشان را نگه
            می‌دارند و با تغییرِ این‌جا عوض نمی‌شوند. */}
        <div className="space-y-2">
          <Label htmlFor="vat">مالیات بر ارزش افزوده (درصد %)</Label>
          <Input
            type="number"
            id="vat"
            {...register("vat", {
              min: { value: 0, message: "درصد مالیات نمی‌تواند منفی باشد" },
              max: { value: 100, message: "درصد مالیات حداکثر ۱۰۰ است" },
            })}
            min="0"
            max="100"
            placeholder="0"
            disabled={Boolean(taxExempt)}
          />
          {errors.vat && (
            <span className="text-xs text-red-500">{errors.vat.message}</span>
          )}
          <Controller
            name="taxExempt"
            control={control}
            render={({ field }) => (
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <Checkbox
                  checked={Boolean(field.value)}
                  onCheckedChange={(checked) =>
                    field.onChange(checked === true)
                  }
                />
                معاف از مالیات
              </label>
            )}
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