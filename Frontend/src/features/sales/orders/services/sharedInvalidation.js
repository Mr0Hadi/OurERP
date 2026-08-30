import { saleKeys } from "./queryKeys";
import {
  shippingKeys,
  outgoingQueueKeys,
} from "@/features/warehouse/shipping/services/queryKeys";
import { incomingQueueKeys } from "@/features/warehouse/receiving/services/queryKeys";
import { productKeys } from "@/features/warehouse/products/services/queryKeys";
import { productUnitKeys } from "@/features/warehouse/units/services/queryKeys";
import { salesReturnKeys } from "../../returns/services/queryKeys";

/**
 * فروش، ارسال و دریافت انبار، و مرجوعی فروش ماژول‌های به‌هم‌گره‌خورده‌اند
 * (یک اکشن در هرکدام می‌تواند وضعیت بقیه را عوض کند). برای جلوگیری از
 * فراموش‌شدن یک کلید کش در یک مسیر، همه‌ی mutationهای این ماژول‌ها از
 * همین یک تابع مرکزی برای invalidation استفاده می‌کنند.
 *
 * کلیدهای کالا هم اینجا هستند چون اثرهای مرجوعی موجودی را جابه‌جا
 * می‌کنند: پس‌گرفتن کالا موجودی را زیاد و ارسال جایگزین آن را کم
 * می‌کند (executeGoodsRound). سمت خرید این را دارد و سمت فروش نداشت.
 *
 * صف‌های ورودی/خروجی انبار هم باید باطل شوند: حضور یک مرجوعی در آن‌ها
 * از روی اثرهای کالاییِ معلقش تعیین می‌شود، پس هر ثبت یا حذف تصمیم
 * می‌تواند آن را وارد یا خارج کند.
 *
 * `freshReturnId` برای وقتی است که پاسخِ همین mutation، سندِ کاملِ یک
 * مرجوعی بوده و لایه‌ی صدازننده آن را با setQueryData نشانده. بدون آن،
 * همان سندِ تازه بلافاصله باطل و دوباره fetch می‌شد — یعنی هر اقدام دو
 * رفت‌وبرگشت به سرور می‌خورد و صفحه یک بار بی‌دلیل پرش می‌کرد.
 * مرجوعی‌های *دیگرِ* همان سند همچنان باطل می‌شوند، چون سهمیه و کارت
 * «مرجوعی‌های دیگر» آن‌ها عوض شده.
 */
export function invalidateSalesEcosystem(queryClient, saleId, { freshReturnId } = {}) {
  if (saleId != null) {
    queryClient.invalidateQueries({ queryKey: saleKeys.detail(saleId) });
    queryClient.invalidateQueries({ queryKey: shippingKeys.detail(saleId) });
    queryClient.invalidateQueries({ queryKey: salesReturnKeys.saleForReturnAll(saleId) });
  }
  queryClient.invalidateQueries({ queryKey: saleKeys.lists() });
  queryClient.invalidateQueries({ queryKey: shippingKeys.lists() });
  queryClient.invalidateQueries({ queryKey: incomingQueueKeys.all });
  queryClient.invalidateQueries({ queryKey: outgoingQueueKeys.all });
  queryClient.invalidateQueries({ queryKey: salesReturnKeys.lists() });
  queryClient.invalidateQueries({
    queryKey: salesReturnKeys.details(),
    predicate: (query) =>
      freshReturnId == null ||
      query.queryKey[query.queryKey.length - 1] !== String(freshReturnId),
  });
  queryClient.invalidateQueries({ queryKey: salesReturnKeys.returnableSales() });
  queryClient.invalidateQueries({ queryKey: productKeys.all });
  // دفترِ دانه‌های کالا هم از همین مسیرها تکان می‌خورد: ثبت فروش دانه‌ها
  // را مصرف (SOLD) می‌کند و لغو فروش آزادشان می‌کند.
  queryClient.invalidateQueries({ queryKey: productUnitKeys.all });
}
