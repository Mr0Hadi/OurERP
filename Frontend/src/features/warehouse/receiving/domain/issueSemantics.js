// src/features/warehouse/receiving/domain/issueSemantics.js

import { RECEIVING_ISSUE_TYPES, RECEIVING_SOURCES } from "./receivingVocabulary";
import { RETURN_PROBLEMS } from "@/shared/domain/returns/problems";

/**
 * «مشکل» در فرم دریافت دو معنای متفاوت دارد و سقفش هم به همین دلیل
 * دو فرمول متفاوت دارد. این تنها جای تعریف آن است تا فرم و کامپوننت‌ها
 * از یک عدد بخوانند.
 *
 *  • خطِ سفارش — مشکل یعنی بخشی از انتظار که *سالم نرسیده*: کسری،
 *    معیوب، اشتباه. کالای معیوب اصلاً در «دریافتی» شمرده نمی‌شود، پس
 *    سقفِ گزارش همان کسری است (انتظار منهای دریافتی).
 *
 *  • خطِ مرجوعی — کالا برگشته و مشکل یعنی *مشاهده‌ی انباردار روی همان
 *    کالای برگشتی*: «۲ تا از این ۵ تا معیوب بود». سقفش خودِ مقدارِ
 *    برگشتی است، نه کسری.
 *
 * تا پیش از این هر دو با فرمول کسری کار می‌کردند. نتیجه این بود که
 * وقتی کلِ کالای برگشتی می‌رسید (کسری = صفر)، انباردار هیچ راهی برای
 * ثبت «بخشی از این معیوب است» نداشت — دقیقاً همان چیزی که صفحه‌ی
 * دریافت مرجوعی برای ثبتش وجود دارد.
 */
export function isObservationLine(item) {
  return item?.source === RECEIVING_SOURCES.RETURN;
}

export function issueBudgetOf(item) {
  if (isObservationLine(item)) {
    return Math.max(0, Number(item.receivedQty) || 0);
  }
  return Math.max(0, (item?.expectedQty || 0) - (item?.receivedQty || 0));
}

/**
 * نوع‌های قابل انتخاب در هر حالت.
 *
 * «کسری تحویل» فقط برای خط سفارش معنا دارد: روی خط مرجوعی، مقداری که
 * برگشته همان چیزی است که انباردار شمرده — چیزی «کم نیامده» که بشود
 * گزارشش کرد. نگه‌داشتنش در فهرست، انباردار را به یک انتخابِ بی‌معنا
 * دعوت می‌کند.
 */
const OBSERVATION_TYPES = Object.values(RECEIVING_ISSUE_TYPES).filter(
  (type) => type !== RETURN_PROBLEMS.SHORT_SHIPPED,
);

export function issueTypesFor(item) {
  return isObservationLine(item)
    ? OBSERVATION_TYPES
    : Object.values(RECEIVING_ISSUE_TYPES);
}

/**
 * پیش‌فرضِ ردیفِ تازه: در خط سفارش، شایع‌ترین حالت «کسری» است؛ در خط
 * مرجوعی، کالا رسیده و شایع‌ترین مشاهده «معیوب» است.
 */
export function defaultIssueTypeFor(item) {
  return isObservationLine(item)
    ? RETURN_PROBLEMS.DEFECTIVE
    : RETURN_PROBLEMS.SHORT_SHIPPED;
}
