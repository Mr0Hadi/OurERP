import { purchaseKeys } from "./queryKeys";
import {
  receivingKeys,
  incomingQueueKeys,
} from "@/features/warehouse/receiving/services/queryKeys";
import { outgoingQueueKeys } from "@/features/warehouse/shipping/services/queryKeys";
import { purchaseReturnKeys } from "../../returns/services/queryKeys";
import { productKeys } from "@/features/warehouse/products/services/queryKeys";
import {
  pendingLabelKeys,
  productUnitKeys,
} from "@/features/warehouse/units/services/queryKeys";

/**
 * چون خرید، دریافت انبار و مرجوعی سه ماژول به‌هم‌گره‌خورده‌اند (یک
 * اکشن در هرکدام می‌تواند وضعیت دو ماژول دیگر را عوض کند)، به‌جای
 * این‌که هر mutation جداگانه و به‌صورت پراکنده کلیدهای کش را
 * invalidate کند (که باعث فراموش‌شدن یک کلید در یک مسیر و «اطلاعات
 * قدیمی که خودش را آپدیت نمی‌کند» می‌شود)، همه از همین یک تابع مرکزی
 * استفاده می‌کنند.
 */
export function invalidatePurchaseEcosystem(
  queryClient,
  purchaseId,
  { freshReturnId } = {},
) {
  if (purchaseId != null) {
    queryClient.invalidateQueries({ queryKey: purchaseKeys.detail(purchaseId) });
    queryClient.invalidateQueries({ queryKey: receivingKeys.detail(purchaseId) });
    queryClient.invalidateQueries({
      queryKey: purchaseReturnKeys.purchaseForReturnAll(purchaseId),
    });
  }
  queryClient.invalidateQueries({ queryKey: purchaseKeys.lists() });
  queryClient.invalidateQueries({ queryKey: receivingKeys.lists() });
  // صف‌های ورودی/خروجی انبار هم باید باطل شوند — دقیقاً به همان دلیلی
  // که سمت فروش دارد: حضور یک مرجوعی در آن‌ها از روی اثرهای کالاییِ
  // معلقش تعیین می‌شود، پس ثبتِ تصمیمِ «کالای جایگزین» یا «عودت به
  // تامین‌کننده» آن را وارد یا خارج می‌کند. نبودشان یعنی صف انبار تا
  // رفرش دستی، تصمیمِ تازه را نمی‌دید.
  queryClient.invalidateQueries({ queryKey: incomingQueueKeys.all });
  queryClient.invalidateQueries({ queryKey: outgoingQueueKeys.all });
  queryClient.invalidateQueries({ queryKey: purchaseReturnKeys.lists() });
  // سندِ مرجوعی‌ای که همین الان از سرور گرفته و نشانده شده، دوباره
  // fetch نمی‌شود — قرینه‌ی سمت فروش.
  queryClient.invalidateQueries({
    queryKey: purchaseReturnKeys.details(),
    predicate: (query) =>
      freshReturnId == null ||
      query.queryKey[query.queryKey.length - 1] !== String(freshReturnId),
  });
  queryClient.invalidateQueries({
    queryKey: purchaseReturnKeys.returnablePurchases(),
  });
  // هر دو سرِ این اکوسیستم موجودی را تکان می‌دهند — دریافت انبار
  // (بخش سالم هر دور) و تصمیمِ «نگهداری» روی کالای مازاد — پس کش
  // کالاها هم باید تازه شود، وگرنه صفحه‌ی کالاها موجودی قدیمی نشان
  // می‌دهد تا وقتی کاربر دستی refresh کند.
  queryClient.invalidateQueries({ queryKey: productKeys.all });
  // دریافتِ کالا موجودی را بالا می‌برد، و «کالاهای بدون برچسب» دقیقاً
  // از تفاضلِ موجودی و واحدهای برچسب‌خورده ساخته می‌شود.
  queryClient.invalidateQueries({ queryKey: productUnitKeys.all });
  queryClient.invalidateQueries({ queryKey: pendingLabelKeys.all });
}