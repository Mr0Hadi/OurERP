import { Warehouse as WarehouseIcon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { useWarehouseChoice } from "../hooks/useMultiWarehouse";
import WarehouseSelect from "./WarehouseSelect";

const TEXTS = {
  in: {
    title: "انبارِ مقصد",
    empty: "انبارِ پیش‌فرض",
    hint: "دانه‌های سالمِ این محموله روی قفسه‌ی همین انبار و خرابی‌ها در قرنطینه‌ی همین انبار گذاشته می‌شوند.",
  },
  out: {
    title: "انبارِ مبدأ",
    empty: "هر انباری",
    hint: "دانه‌های بی‌رزرو (مازاد، کالای جایگزین، فروشِ قدیمی) فقط از این انبار برداشته می‌شوند؛ دانه‌های رزروشده همان‌هایی‌اند که هنگامِ بررسی رزرو شدند.",
  },
};

/**
 * انبارِ یک محموله (`warehouseId` روی دریافت/ارسال و دورهای مرجوعی). فقط وقتی انتخاب معنا دارد رندر می‌شود
 * (`useWarehouseChoice`)؛ `null` یعنی پیش‌فرضِ سرور.
 *
 * @param direction `"in"` (ورود) یا `"out"` (خروج)
 */
export default function ShipmentWarehouseCard({ direction, value, onChange, disabled }) {
  const choice = useWarehouseChoice();
  if (!choice) return null;
  const text = TEXTS[direction];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-1.5 text-base font-semibold">
          <WarehouseIcon className="size-4 text-muted-foreground" />
          {text.title}
        </CardTitle>
        <p className="text-xs text-muted-foreground">{text.hint}</p>
      </CardHeader>
      <CardContent>
        <fieldset disabled={disabled}>
          <WarehouseSelect value={value} onChange={onChange} emptyLabel={text.empty} aria-label={text.title} />
        </fieldset>
      </CardContent>
    </Card>
  );
}
