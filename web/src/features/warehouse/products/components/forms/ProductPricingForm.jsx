// src/features/warehouse/products/components/forms/ProductPricingForm.jsx
import { Input } from "#/shared/components/ui/input";
import { Label } from "#/shared/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "#/shared/components/ui/card";

export default function ProductPricingForm({ register, stock = 0 }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">موجودی و قیمت‌گذاری</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2 md:col-span-2">
          <div className="p-3 bg-muted/50 rounded-lg border border-border">
            <p className="text-sm text-muted-foreground">
              <strong>توجه:</strong> مقدار موجودی به صورت خودکار از طریق ثبت‌های حرکت انبار محاسبه می‌شود و قابل ویرایش نیست.
              برای تغییر موجودی باید از طریق خرید یا فروش اقدام کنید.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="stockDisplay">موجودی فعلی</Label>
          <Input
            id="stockDisplay"
            value={stock}
            disabled
            className="bg-muted/50 text-muted-foreground cursor-not-allowed"
          />
          <p className="text-xs text-muted-foreground">این مقدار فقط از طریق خرید (ورود کالا) یا فروش (خروج کالا) تغییر می‌کند و قابل ویرایش دستی نیست.</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="reorderThreshold">آستانه سفارش (حداقل موجودی مورد نیاز)</Label>
          <Input
            type="number"
            id="reorderThreshold"
            {...register("reorderThreshold")}
            min="0"
            placeholder="مثال: 5"
          />
          <p className="text-xs text-muted-foreground">حداقل تعداد موجودی که هنگام رسیدن به آن، محصول به عنوان کم‌موجودی نمایش داده می‌شود.</p>
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
