import { allSalesReturns } from "@/features/sales/returns/services/mockData";
import { executeGoodsRound } from "@/features/sales/returns/services/api-mockData";
import { buildGoodsLines } from "@/shared/domain/returns/resolutions";
import { EFFECT_KINDS } from "@/shared/domain/returns/effects";

/**
 * نمای «دریافت کالای مرجوعی» برای انبار.
 *
 * این فایل دیگر منطق ندارد و فقط یک آداپتور است: صفحه‌ی انبار را به
 * موتور اثرِ مرجوعی وصل می‌کند. کل حساب‌وکتابِ اینکه چه چیزی باید
 * تحویل گرفته شود، چقدرش باقی مانده و چه اثری روی موجودی دارد در
 * sales/returns است — اینجا فقط شکل داده ترجمه می‌شود.
 *
 * تفاوت مهم با نسخه‌ی قبلی: «بازرسی» دیگر یک مرحله‌ی اجباری پیش از
 * تصمیم‌گیری نیست. انبار وقتی کالایی می‌بیند که *قبلاً* تصمیم گرفته
 * شده باشد پس گرفته شود؛ پس اینجا چیزی برای بازرسی وجود ندارد مگر
 * اینکه واحد فروش خواسته باشد.
 */

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchReturnIntake(returnId) {
  await delay(300);

  const salesReturn = allSalesReturns.find(
    (r) => Number(r.id) === Number(returnId),
  );
  if (!salesReturn) throw new Error("مرجوعی یافت نشد");

  return {
    ...salesReturn,
    intakeLines: buildGoodsLines(salesReturn, EFFECT_KINDS.GOODS_IN),
  };
}

/**
 * ثبت یک دور تحویل‌گرفتن کالای برگشتی.
 *
 * ورودی همان payloadی است که فرمِ دریافت خرید می‌سازد، تا هر دو مسیر
 * یک شکل داشته باشند. «سالم» از روی مشکلاتِ گزارش‌شده حساب می‌شود —
 * همان قاعده‌ای که برای خطوط سفارش هم به کار می‌رود — نه یک فیلد
 * جداگانه که انباردار باید دوباره پرش کند.
 */
export async function confirmReturnIntake(returnId, intakeData) {
  const rounds = (intakeData.receivedItems || [])
    .map((row) => {
      const qty = Number(row.receivedQty) || 0;
      if (qty <= 0) return null;
      const issuesQty = (row.issues || []).reduce(
        (sum, i) => sum + (Number(i.qty) || 0),
        0,
      );
      return {
        effectId: row.effectId,
        qty,
        healthyQty: Math.max(0, qty - issuesQty),
        issueNote: (row.issues || [])
          .map((i) => i.note)
          .filter(Boolean)
          .join(" / "),
      };
    })
    .filter(Boolean);

  return executeGoodsRound(returnId, {
    rounds,
    date: intakeData.receivedDate,
    partyName: intakeData.transporterName,
    partyNationalId: intakeData.transporterNationalId,
    vehiclePlate: intakeData.vehiclePlate,
    note: intakeData.receivingNote,
  });
}
