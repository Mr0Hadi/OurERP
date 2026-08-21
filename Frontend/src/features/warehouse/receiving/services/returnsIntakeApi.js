import { allSalesReturns } from "@/features/sales/returns/services/mockData";
import { executeGoodsRound } from "@/features/sales/returns/services/api-mockData";
import { buildGoodsLines } from "@/features/sales/returns/domain/returnResolutions";
import { EFFECT_KINDS } from "@/features/sales/returns/domain/returnEffects";

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
 * lines: [{ effectId, qty, healthyQty, issueNote }]
 *   healthyQty یعنی چقدر از کالای دریافتیِ همین دور سالم و قابل فروش
 *   دوباره بوده. باقی‌اش دریافت می‌شود و ادعا را می‌بندد، ولی وارد
 *   موجودی قابل‌فروش نمی‌شود.
 */
export async function confirmReturnIntake(returnId, intakeData) {
  return executeGoodsRound(returnId, {
    rounds: intakeData.lines || [],
    date: intakeData.receivedDate,
    partyName: intakeData.transporterName,
    partyNationalId: intakeData.transporterNationalId,
    vehiclePlate: intakeData.vehiclePlate,
    note: intakeData.receivingNote,
  });
}
