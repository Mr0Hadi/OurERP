// src/features/sales/services/sharedInvalidation.js
import { saleKeys } from "./queryKeys";
import { shippingKeys } from "@/features/warehouse/shipping/services/queryKeys";
import { salesReturnKeys } from "../../returns/services/queryKeys";

/**
 * فروش، ارسال انبار و مرجوعی فروش سه ماژول به‌هم‌گره‌خورده‌اند (یک
 * اکشن در هرکدام می‌تواند وضعیت دو ماژول دیگر را عوض کند). برای
 * جلوگیری از فراموش‌شدن یک کلید کش در یک مسیر، همه‌ی mutationهای این
 * سه ماژول از همین یک تابع مرکزی برای invalidation استفاده می‌کنند.
 */
export function invalidateSalesEcosystem(queryClient, saleId) {
  if (saleId != null) {
    queryClient.invalidateQueries({ queryKey: saleKeys.detail(saleId) });
    queryClient.invalidateQueries({ queryKey: shippingKeys.detail(saleId) });
  }
  queryClient.invalidateQueries({ queryKey: saleKeys.lists() });
  queryClient.invalidateQueries({ queryKey: shippingKeys.lists() });
  queryClient.invalidateQueries({ queryKey: salesReturnKeys.lists() });
  queryClient.invalidateQueries({ queryKey: salesReturnKeys.details() });
  queryClient.invalidateQueries({ queryKey: salesReturnKeys.returnableSales() });
}
