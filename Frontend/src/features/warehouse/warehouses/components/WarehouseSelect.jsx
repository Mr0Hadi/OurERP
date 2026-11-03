import OptionSelect from "@/shared/components/forms/OptionSelect";
import { cn } from "@/shared/lib/utils";
import { useWarehousesQuery } from "../services/queries";
import { useWarehouseChoice } from "../hooks/useMultiWarehouse";

/**
 * انتخابِ انبار (`warehouseId`). فقط وقتی چندانبار روشن است و بیش از یک انبارِ فعال هست رندر می‌شود؛ وگرنه انتخابی
 * در کار نیست (سرور خودش انبارِ پیش‌فرض/هر انبار را برمی‌دارد).
 *
 * @param value      `warehouseId` یا `null`
 * @param onChange   `(id|null) => void`
 * @param emptyLabel ردیفِ «بدونِ انتخاب» و معنایش برای همین فرم: «انبارِ پیش‌فرض» برای ورود، «هر انباری» برای خروج،
 *                   «همه‌ی انبارها» برای فیلتر. بی آن ردیفِ خالی ندارد.
 * @param always     حتی با سوییچِ خاموش نشان بده (فیلترِ داده‌ی قبلی، فرمِ حواله)
 * @param exclude    شناسه‌ای که نباید انتخاب‌شدنی باشد (مبدأ در انتخابِ مقصد)
 */
export default function WarehouseSelect({
  id,
  value,
  onChange,
  emptyLabel,
  always = false,
  exclude,
  className,
  "aria-label": ariaLabel,
}) {
  const choice = useWarehouseChoice();
  const { data: warehouses = [], isLoading } = useWarehousesQuery();
  if (!always && !choice) return null;

  return (
    <OptionSelect
      id={id}
      dir="rtl"
      value={value}
      onChange={onChange}
      numeric
      isLoading={isLoading}
      placeholder="انتخابِ انبار"
      emptyLabel={emptyLabel && <span className="text-muted-foreground">{emptyLabel}</span>}
      emptyValue={null}
      className={cn("h-9 w-full", className)}
      aria-label={ariaLabel ?? "انبار"}
      options={warehouses.map((warehouse) => ({
        value: warehouse.id,
        disabled: warehouse.id === exclude,
        label: (
          <span className="truncate">
            {warehouse.name}
            <span className="text-xs text-muted-foreground">
              {" · "}
              {warehouse.code}
              {warehouse.isDefault && "، پیش‌فرض"}
            </span>
          </span>
        ),
      }))}
    />
  );
}
