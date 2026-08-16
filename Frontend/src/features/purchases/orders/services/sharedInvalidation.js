import { purchaseKeys } from "./queryKeys";
import { receivingKeys } from "@/features/warehouse/receiving/services/queryKeys";
import { purchaseReturnKeys } from "../../returns/services/queryKeys";
import { productKeys } from "@/features/warehouse/products/services/queryKeys";

/**
 * چون خرید، دریافت انبار و مرجوعی سه ماژول به‌هم‌گره‌خورده‌اند (یک
 * اکشن در هرکدام می‌تواند وضعیت دو ماژول دیگر را عوض کند)، به‌جای
 * این‌که هر mutation جداگانه و به‌صورت پراکنده کلیدهای کش را
 * invalidate کند (که باعث فراموش‌شدن یک کلید در یک مسیر و «اطلاعات
 * قدیمی که خودش را آپدیت نمی‌کند» می‌شود)، همه از همین یک تابع مرکزی
 * استفاده می‌کنند.
 */
export function invalidatePurchaseEcosystem(queryClient, purchaseId) {
  if (purchaseId != null) {
    queryClient.invalidateQueries({ queryKey: purchaseKeys.detail(purchaseId) });
    queryClient.invalidateQueries({ queryKey: receivingKeys.detail(purchaseId) });
    queryClient.invalidateQueries({
      queryKey: purchaseReturnKeys.reportDetail(purchaseId),
    });
  }
  queryClient.invalidateQueries({ queryKey: purchaseKeys.lists() });
  queryClient.invalidateQueries({ queryKey: receivingKeys.lists() });
  queryClient.invalidateQueries({ queryKey: purchaseReturnKeys.lists() });
  queryClient.invalidateQueries({ queryKey: purchaseReturnKeys.reports() });
  queryClient.invalidateQueries({ queryKey: purchaseReturnKeys.details() });
  // هر دو سرِ این اکوسیستم موجودی را تکان می‌دهند — دریافت انبار
  // (بخش سالم هر دور) و تصمیمِ «نگهداری» روی کالای مازاد — پس کش
  // کالاها هم باید تازه شود، وگرنه صفحه‌ی کالاها موجودی قدیمی نشان
  // می‌دهد تا وقتی کاربر دستی refresh کند.
  queryClient.invalidateQueries({ queryKey: productKeys.all });
}