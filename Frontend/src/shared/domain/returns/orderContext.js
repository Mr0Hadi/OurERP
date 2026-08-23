import { EFFECT_KINDS } from "./effects";
import { RETURN_STATUSES } from "./statuses";
import { claimRemainingQty } from "./resolutions";

/**
 * نمای «همه‌ی مرجوعی‌های یک سند» — مشترک بین خرید و فروش.
 *
 * وقتی روی یک سند چند دور مرجوعی می‌خورد، صفحه‌ی جزئیاتِ هر مرجوعی
 * باید دو چیز را درست نشان دهد و تا امروز هیچ‌کدام را نمی‌داد:
 *
 *   ۱. مقدارِ واقعیِ تحویل‌شده — که با هر دورِ جابه‌جاییِ کالا عوض
 *      می‌شود، نه فقط با دریافت/ارسالِ خودِ سند.
 *   ۲. اینکه بقیه‌ی مرجوعی‌ها چه سهمی از همین قلم برداشته‌اند و
 *      کدام‌ها هستند.
 */

/** مرجوعی‌هایی که هنوز «زنده»اند؛ رد/لغوشده سهمیه را آزاد می‌کنند. */
const ACTIVE_STATUSES = new Set([
  RETURN_STATUSES.OPEN,
  RETURN_STATUSES.IN_PROGRESS,
  RETURN_STATUSES.SETTLED,
]);

export function isActiveReturn(returnDoc) {
  return ACTIVE_STATUSES.has(returnDoc?.status);
}

/** همه‌ی مرجوعی‌های یک سند، به ترتیبِ تازه‌ترین. */
export function returnsOfOrder(allReturns, orderIdKey, orderId) {
  return (allReturns || [])
    .filter((ret) => Number(ret[orderIdKey]) === Number(orderId))
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}

/**
 * آیا این ادعا روی همان خطِ سند نشسته؟
 *
 * معیارِ اصلی `orderLineId` است (شناسه‌ی واقعیِ خط سند، معادلِ
 * `SaleItem.Id`/`PurchaseItem.Id`). تطبیق با `productId` فقط وقتی
 * انجام می‌شود که ادعا شناسه‌ی خط نداشته باشد — حالتی که فقط برای
 * داده‌ی قدیمی پیش می‌آید. تکیه‌ی همیشگی بر `productId` غلط است:
 * یک کالا می‌تواند در دو خط فاکتور با قیمت متفاوت باشد و آن دو خط
 * سهمیه‌ی جداگانه دارند.
 */
function matchesLine(claim, line) {
  if (claim.orderLineId != null && line.orderLineId != null) {
    return String(claim.orderLineId) === String(line.orderLineId);
  }
  return claim.productId === line.productId;
}

function eachOnOrderEffect(returnDoc, line, visit) {
  (returnDoc.claims || []).forEach((claim) => {
    // ادعای خارج از سند روی هیچ خطی از فاکتور نمی‌نشیند، پس نباید
    // مقدارِ تحویلِ آن خط را جابه‌جا کند.
    if (claim.offScopeKind) return;
    if (!matchesLine(claim, line)) return;
    (claim.resolutions || []).forEach((res) =>
      (res.effects || []).forEach((effect) => {
        if (effect.productId !== claim.productId) return;
        visit(effect);
      }),
    );
  });
}

/**
 * `line` یک `{ orderLineId, productId }` است، نه فقط شناسه‌ی کالا.
 *
 * چقدر به مقدارِ تحویلِ یک خط اضافه (یا از آن کم) شده، بابت کالایی که
 * *واقعاً* جابه‌جا شده — یعنی فقط doneQty، نه آنچه صرفاً تصمیم گرفته
 * شده.
 *
 * جهت‌ها قرینه‌ی هم نیستند و این عمدی است، چون شمارنده‌ی پایه‌ی هر
 * سمت فرق می‌کند:
 *
 *  • خرید: receivedQty فقط کالای *سالم* را می‌شمارد — کالای معیوب از
 *    همان ابتدا در آن نیامده. پس کالای جایگزینی که می‌رسد اضافه
 *    می‌شود، ولی عودتِ کالای معیوب چیزی کم نمی‌کند: آن مقدار هرگز
 *    شمرده نشده بود که حالا کم شود.
 *
 *  • فروش: shippedQty هرچه فرستاده‌ایم را می‌شمارد، سالم یا نه. پس
 *    پس‌گرفتن از مشتری کم می‌کند و ارسال جایگزین اضافه.
 */
export function deliveredAdjustment(returns, line, { side }) {
  let adjustment = 0;

  returns.forEach((ret) => {
    if (!isActiveReturn(ret)) return;
    eachOnOrderEffect(ret, line, (effect) => {
      const done = Number(effect.doneQty) || 0;
      if (done <= 0) return;

      if (side === "purchase") {
        if (effect.kind === EFFECT_KINDS.GOODS_IN) adjustment += done;
      } else {
        if (effect.kind === EFFECT_KINDS.GOODS_OUT) adjustment += done;
        if (effect.kind === EFFECT_KINDS.GOODS_IN) adjustment -= done;
      }
    });
  });

  return adjustment;
}

/**
 * سهمِ هر مرجوعی از یک قلم: چقدر در *این* مرجوعی هنوز معلق است و چقدر
 * در بقیه.
 *
 * عمداً qty خامِ ادعا را نمی‌شمارد، بلکه claimRemainingQty را — یعنی
 * سهمی که هنوز تصمیمی برایش گرفته نشده. یک ادعا که تصمیمش گرفته شده
 * دیگر یک رزروِ باز نیست: یا کالای جایگزینش رسیده و همان مقدار از
 * مسیر deliveredAdjustment به تحویل‌شده اضافه شده، یا فقط وجه برگشته
 * و چیزی از قلم کم نشده. اگر همچنان qty کامل شمرده می‌شد، هر ادعای
 * حل‌شده برای همیشه در «مرجوعی دیگر» می‌ماند و عدد با هر مرجوعیِ تازه
 * روی همان قلم فقط بالاتر می‌رفت — دقیقاً چیزی که این تابع باید از آن
 * جلوگیری کند.
 */
export function claimBreakdown(returns, line, currentReturnId = null) {
  let here = 0;
  let elsewhere = 0;

  returns.forEach((ret) => {
    if (!isActiveReturn(ret)) return;

    let claimed = 0;
    (ret.claims || []).forEach((claim) => {
      if (claim.offScopeKind) return;
      if (!matchesLine(claim, line)) return;
      claimed += claimRemainingQty(claim);
    });
    if (claimed === 0) return;

    if (currentReturnId != null && Number(ret.id) === Number(currentReturnId)) {
      here += claimed;
    } else {
      elsewhere += claimed;
    }
  });

  return { here, elsewhere };
}

/**
 * خلاصه‌ی مرجوعی‌های دیگرِ همین سند، برای اینکه کاربر بتواند بینشان
 * جابه‌جا شود به‌جای اینکه به لیست برگردد و دستی دنبالشان بگردد.
 */
export function relatedReturnsSummary(returns, currentReturnId) {
  return returns
    .filter((ret) => Number(ret.id) !== Number(currentReturnId))
    .map((ret) => ({
      id: ret.id,
      returnNumber: ret.returnNumber,
      returnDate: ret.returnDate,
      status: ret.status,
      totalClaimedAmount: ret.totalClaimedAmount || 0,
      claimsCount: (ret.claims || []).length,
    }));
}
