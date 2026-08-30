// src/features/dashboard/services/mockData.js

/**
 * فعالیتِ روزانه‌ی ساختگیِ کسب‌وکار — ماده‌ی خامِ هر دو گزارشِ داشبورد.
 *
 * چرا روزانه و نه مستقیماً «چند سطرِ ماهانه»: `periodType` در UI قابلِ
 * تغییر است. اگر mock فهرستِ آماده‌ی ماهانه می‌داد، سوییچ به «روزانه» یا
 * «فصلی» هیچ اثری نداشت و درستیِ گروه‌بندی تازه بعد از وصل‌شدن به سرور
 * معلوم می‌شد. با داده‌ی روزانه، `groupByPeriod` همان کاری را می‌کند که
 * سرور می‌کند.
 *
 * اعداد **قطعی** (deterministic) هستند: یک PRNG با seed ثابت. با
 * `Math.random` هر بار رفرش، نمودار شکلِ دیگری داشت و تشخیصِ این‌که
 * تغییرِ ظاهر از تغییرِ کد بوده یا از داده، ممکن نبود.
 */

const SEED = 0x5eed_1234;
const DAYS_OF_HISTORY = 460; // ≈ ۱۵ ماه، تا بازه‌ی پیش‌فرضِ ۱۲ماهه پُر باشد

/** mulberry32 — کوچک، سریع و برای داده‌ی نمایشی کافی. */
function makeRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const round = (value) => Math.round(value / 1000) * 1000;

function buildDailyActivity() {
  const random = makeRandom(SEED);
  const rows = [];

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  for (let offset = DAYS_OF_HISTORY - 1; offset >= 0; offset--) {
    const date = new Date(today);
    date.setUTCDate(date.getUTCDate() - offset);
    const iso = date.toISOString().slice(0, 10);
    const weekDay = date.getUTCDay(); // ۵ = جمعه

    // رشدِ آرامِ سالانه + یک موجِ فصلی، تا نمودار روند داشته باشد نه نویزِ محض
    const progress = (DAYS_OF_HISTORY - offset) / DAYS_OF_HISTORY;
    const trend = 0.75 + progress * 0.55;
    const seasonal = 1 + 0.18 * Math.sin((progress * Math.PI * 2 * 15) / 12);
    const weekend = weekDay === 5 ? 0.25 : weekDay === 4 ? 0.7 : 1;

    const intensity = trend * seasonal * weekend * (0.75 + random() * 0.5);

    const salesCount = Math.round(intensity * 6 * (0.6 + random() * 0.8));
    const averageTicket = 11_000_000 * (0.7 + random() * 0.7);
    const saleInvoiceAmount = round(salesCount * averageTicket);

    // ارسالِ فیزیکی معمولاً همان روز نیست؛ بخشی از فاکتورهای روزهای قبل
    // امروز ارسال می‌شود. همین باعث می‌شود `revenue` و
    // `totalInvoiceAmount` در یک بازه دقیقاً یکی نباشند — همان تفاوتِ
    // عمدی‌ای که بخش ۱۸ سند توضیح داده.
    const revenue = round(saleInvoiceAmount * (0.72 + random() * 0.4));
    const marginRate = 0.19 + random() * 0.12;
    const costOfGoodsSold = round(revenue * (1 - marginRate));

    // خرید رویدادِ کم‌تکرارتری است — هر چند روز یک‌بار، ولی سنگین‌تر.
    const hasPurchase = random() < 0.28 && weekDay !== 5;
    const purchasesCount = hasPurchase ? 1 + Math.floor(random() * 2) : 0;
    const purchaseInvoiceAmount = hasPurchase
      ? round(purchasesCount * 90_000_000 * (0.6 + random() * 0.9) * trend)
      : 0;
    // رسیدِ کالا هم با فاصله از فاکتور اتفاق می‌افتد و گاهی ناقص است.
    const totalReceivedValue = hasPurchase
      ? round(purchaseInvoiceAmount * (0.7 + random() * 0.45))
      : 0;

    rows.push({
      date: iso,
      salesCount,
      saleInvoiceAmount,
      revenue,
      costOfGoodsSold,
      purchasesCount,
      purchaseInvoiceAmount,
      totalReceivedValue,
    });
  }

  return rows;
}

/** یک‌بار ساخته می‌شود و در طولِ عمرِ صفحه ثابت می‌ماند. */
export const dailyActivity = buildDailyActivity();
