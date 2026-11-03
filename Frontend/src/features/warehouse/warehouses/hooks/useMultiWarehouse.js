import { useFeatureFlags } from "@/features/auth/hooks/useFeatureFlags";
import { useWarehousesQuery } from "../services/queries";

/** کلیدِ سوییچِ چندانبار (`Warehouse.MultiWarehouseEnabled`، `api-guide` بخش ۲۲ و ۲۵). */
export const MULTI_WAREHOUSE_FLAG = "Warehouse.MultiWarehouseEnabled";

/**
 * آیا چندانبار روشن است؟ وقتی خاموش است سرور `warehouseId`ِ دریافت/ارسال/مرجوعی را نادیده می‌گیرد (ورود به انبارِ
 * پیش‌فرض، خروج از هر انباری) و حواله‌ی تازه نمی‌پذیرد؛ پس انتخابگرِ انبار و «حواله‌ی تازه» پنهان می‌شوند. داده‌ی
 * قبلی (انبارِ هر دانه، حواله‌های در راه) همیشه خواندنی و تمام‌کردنی است.
 */
export function useMultiWarehouse() {
  const { isOn, isPending } = useFeatureFlags();
  return { enabled: isOn(MULTI_WAREHOUSE_FLAG), isPending };
}

/**
 * آیا انتخابِ انبار معنا دارد؟ چندانبار روشن و بیش از یک انبارِ فعال. وگرنه سرور خودش انبارِ پیش‌فرض/هر انبار را
 * برمی‌دارد و انتخابگر فقط شلوغی است.
 */
export function useWarehouseChoice() {
  const multi = useMultiWarehouse();
  const { data: warehouses = [] } = useWarehousesQuery({ enabled: multi.enabled });
  return multi.enabled && warehouses.length > 1;
}
