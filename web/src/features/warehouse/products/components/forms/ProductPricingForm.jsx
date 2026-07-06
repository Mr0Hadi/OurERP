// src/features/warehouse/products/components/forms/ProductPricingForm.jsx
import { Input } from "#/shared/components/ui/input";
import { Label } from "#/shared/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "#/shared/components/ui/card";

export default function ProductPricingForm({ register }) {
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
            placeholder="مثال: 9"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="purchasePrice">قیمت خرید (تومان)</Label>
          <Input
            type="number"
            
            id="purchasePrice"
            {...register("purchasePrice")}
            min="0"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="sellPrice1">قیمت فروش اول (تومان)</Label>
          <Input
            type="number"
            
            id="sellPrice1"
            {...register("sellPrice1")}
            min="0"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="sellPrice2">قیمت فروش دوم (همکار/عمده)</Label>
          <Input
            type="number"
            
            id="sellPrice2"
            {...register("sellPrice2")}
            min="0"
          />
        </div>
      </CardContent>
    </Card>
  );
}
