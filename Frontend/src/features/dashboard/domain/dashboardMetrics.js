// src/features/dashboard/domain/dashboardMetrics.js

import {
  PREVIOUS_PERIOD_LABELS,
  formatPeriodLabel,
  formatPeriodRange,
} from "@/shared/domain/enums/reportPeriod";

/**
 * تبدیلِ دو پاسخِ خامِ `api/Report` به چیزی که نمودارها و کارت‌ها
 * می‌خواهند.
 *
 * چرا اینجا و نه در `api-mockData`: اگر mock خروجیِ آماده‌ی نمودار
 * می‌داد، دیگر شکلش با سرور یکی نبود و روز مهاجرت همه‌ی کارت‌ها
 * می‌شکستند. لایه‌ی API فقط همان چیزی را می‌دهد که روی سیم می‌آید؛
 * هر مشتقی — برچسبِ شمسی، حاشیه‌ی سود، درصدِ رشد — اینجا ساخته می‌شود.
 */

// ─── ادغامِ دو گزارش ────────────────────────────────────────────────────────

/**
 * فروش و خرید در یک ردیف به‌ازای هر بازه.
 *
 * دو گزارش لزوماً بازه‌های یکسانی ندارند: ممکن است ماهی خرید داشته
 * باشد ولی فروش نه. پس اجتماعِ کلیدها گرفته می‌شود و طرفِ غایب صفر
 * می‌شود — وگرنه ستون‌های دو سری روی محور از هم می‌افتند و مقایسه
 * بی‌معنا می‌شود.
 *
 * کلیدِ ادغام `periodStart` است چون هر دو گزارش با یک `periodType`
 * صدا زده شده‌اند و مرزهایشان دقیقاً یکی است.
 */
export function buildPeriodSeries(salePeriods, purchasePeriods, periodType) {
  const merged = new Map();

  const ensure = (period) => {
    const key = String(period.periodStart);
    if (!merged.has(key)) {
      merged.set(key, {
        key,
        periodStart: period.periodStart,
        periodEnd: period.periodEnd,
        label: formatPeriodLabel(period.periodStart, periodType),
        tooltipLabel: formatPeriodRange(period.periodStart, period.periodEnd),
        values: {
          revenue: 0,
          costOfGoodsSold: 0,
          netProfit: 0,
          saleInvoiceAmount: 0,
          salesCount: 0,
          purchaseInvoiceAmount: 0,
          totalReceivedValue: 0,
          purchasesCount: 0,
        },
      });
    }
    return merged.get(key);
  };

  for (const period of salePeriods) {
    const row = ensure(period);
    row.values.revenue = Number(period.revenue) || 0;
    row.values.costOfGoodsSold = Number(period.costOfGoodsSold) || 0;
    row.values.netProfit = Number(period.netProfit) || 0;
    row.values.saleInvoiceAmount = Number(period.totalInvoiceAmount) || 0;
    row.values.salesCount = Number(period.salesCount) || 0;
  }

  for (const period of purchasePeriods) {
    const row = ensure(period);
    row.values.purchaseInvoiceAmount = Number(period.totalInvoiceAmount) || 0;
    row.values.totalReceivedValue = Number(period.totalReceivedValue) || 0;
    row.values.purchasesCount = Number(period.purchasesCount) || 0;
  }

  const rows = [...merged.values()].sort((a, b) =>
    String(a.periodStart) < String(b.periodStart) ? -1 : 1,
  );

  // آخرین بازه معمولاً هنوز تمام نشده و در نمودار به‌صورت یک سقوطِ
  // ناگهانی دیده می‌شود. حذفش داده را ناقص می‌کرد، پس می‌ماند ولی
  // علامت می‌خورد — هم در حباب، هم در جدول.
  const last = rows[rows.length - 1];
  if (last?.periodEnd && new Date(last.periodEnd) > new Date()) {
    last.isOpen = true;
    last.tooltipLabel = `${last.tooltipLabel} — هنوز تمام نشده`;
  }

  return rows;
}

// ─── جمع‌ها و شاخص‌ها ───────────────────────────────────────────────────────

const sum = (series, key) =>
  series.reduce((acc, row) => acc + (Number(row.values[key]) || 0), 0);

/** حاشیه‌ی سود بر حسب درصد؛ بدونِ درآمد، تعریف‌نشده است نه صفر. */
export function profitMargin(netProfit, revenue) {
  if (!revenue) return null;
  return (netProfit / revenue) * 100;
}

/**
 * بازه‌های *تمام‌شده*.
 *
 * آخرین بازه تقریباً همیشه ناقص است — امروز روز هفتمِ ماه است و ماه
 * جاری فقط هفت روز داده دارد. مقایسه‌ی همان با ماهِ کاملِ قبل، در همه‌ی
 * کارت‌ها یک «افتِ ۷۸٪» جعلی نشان می‌دهد. برای *رسم* نگهش می‌داریم
 * (داده‌ی واقعی است)، ولی برای *مقایسه* کنارش می‌گذاریم.
 */
function completedPeriods(series) {
  if (series.length === 0) return series;
  const last = series[series.length - 1];
  const isOpen = last.periodEnd && new Date(last.periodEnd) > new Date();
  return isOpen ? series.slice(0, -1) : series;
}

/**
 * درصدِ تغییرِ آخرین بازه‌ی کامل نسبت به بازه‌ی قبل از آن.
 *
 * `null` وقتی مبنا صفر است: «رشدِ بی‌نهایت» عددِ بی‌معنایی است و در
 * کارت به‌صورت «—» نشان داده می‌شود، نه ۱۰۰٪+ که خواننده را گمراه کند.
 */
function periodOverPeriodChange(series, key) {
  const closed = completedPeriods(series);
  if (closed.length < 2) return null;
  const current = Number(closed[closed.length - 1].values[key]) || 0;
  const previous = Number(closed[closed.length - 2].values[key]) || 0;
  if (!previous) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

const sparkOf = (series, key) =>
  series.map((row) => Number(row.values[key]) || 0);

/**
 * بازه‌ی تاریخیِ واقعیِ داده — از شروعِ اولین بازه تا پایانِ آخری.
 *
 * لازم است چون بازه معمولاً *انتخاب نشده* و پیش‌فرضِ سرور (۱۲ ماه اخیر)
 * جایی نوشته نشده؛ کاربر باید بداند عددهای بالای صفحه مجموعِ چه مدتی
 * هستند.
 */
export function describeRange(series) {
  if (series.length === 0) return "";
  return formatPeriodRange(series[0].periodStart, series[series.length - 1].periodEnd);
}

/**
 * شاخص‌های بالای صفحه — عمداً چهارتا.
 *
 * نسخه‌ی اول شش کارت داشت و «بهای تمام‌شده» و «تعداد فروش» هم بینشان
 * بود؛ ولی بهای تمام‌شده همان لحظه در دوناتِ ترکیبِ درآمد و در نمودارِ
 * روند هم دیده می‌شود و تعداد فروش در جدول. کارتِ تکراری فقط ردیف را
 * شلوغ می‌کند و چشم را از چیزی که واقعاً باید ببیند دور.
 *
 * `direction` می‌گوید بالا رفتنِ این شاخص خوب است یا بد — بدونِ آن،
 * «رشدِ ۲۰٪ در هزینه» با همان سبزِ «رشدِ ۲۰٪ در سود» نشان داده می‌شد و
 * دقیقاً برعکسِ واقعیت خوانده می‌شد.
 */
export function buildKpis(series, periodType) {
  const revenue = sum(series, "revenue");
  const netProfit = sum(series, "netProfit");
  const margin = profitMargin(netProfit, revenue);

  // مجموع‌ها به `periodType` بی‌اعتنا هستند — بازه‌ی تاریخی همان است و
  // فقط بازه‌بندی‌اش عوض می‌شود. تنها چیزی که با سطحِ گزارش تغییر می‌کند
  // مبنای مقایسه‌ی درصدِ رشد است، و کارت باید همین را صریح بگوید وگرنه
  // کاربر عددِ ثابت را باگ می‌بیند.
  const comparison = PREVIOUS_PERIOD_LABELS[periodType] ?? "بازه قبل";

  return [
    {
      key: "revenue",
      label: "درآمد فروش",
      hint: "مبلغ خالصِ فروش‌های ارسال‌شده، پس از کسر بازپرداختِ مرجوعی‌ها",
      value: revenue,
      format: "amount",
      unit: "ریال",
      change: periodOverPeriodChange(series, "revenue"),
      spark: sparkOf(series, "revenue"),
      color: "var(--chart-1)",
      direction: "up",
      comparison,
    },
    {
      key: "netProfit",
      label: "سود خالص",
      hint: "درآمد منهای بهای تمام‌شده، با میانگین موزونِ هزینه در لحظه‌ی ارسال",
      value: netProfit,
      format: "amount",
      unit: "ریال",
      change: periodOverPeriodChange(series, "netProfit"),
      spark: sparkOf(series, "netProfit"),
      color: "var(--chart-3)",
      direction: "up",
      comparison,
    },
    {
      key: "margin",
      label: "حاشیه سود",
      hint: "سهم سود از هر ریال درآمد در کل بازه",
      value: margin,
      format: "percent",
      change: null,
      spark: series.map((row) =>
        profitMargin(row.values.netProfit, row.values.revenue) ?? 0,
      ),
      color: "var(--chart-2)",
      direction: "up",
      comparison,
    },
    {
      key: "totalReceivedValue",
      label: "کالای دریافتی",
      hint: "ارزش واقعی کالای واردشده به انبار در همین بازه",
      value: sum(series, "totalReceivedValue"),
      format: "amount",
      unit: "ریال",
      change: periodOverPeriodChange(series, "totalReceivedValue"),
      spark: sparkOf(series, "totalReceivedValue"),
      color: "var(--chart-4)",
      direction: "up",
      comparison,
    },
  ];
}

/**
 * ترکیبِ درآمد در کل بازه — چقدرش هزینه‌ی کالا بود و چقدر سود ماند.
 *
 * در بازه‌ی زیان‌ده، سهمِ سود منفی است و دونات آن را رسم نمی‌کند؛
 * تفسیرِ درست را کارتِ سودِ خالص می‌دهد نه این حلقه.
 */
export function buildRevenueBreakdown(series) {
  return [
    {
      key: "costOfGoodsSold",
      label: "بهای تمام‌شده",
      value: sum(series, "costOfGoodsSold"),
      color: "var(--chart-5)",
    },
    {
      key: "netProfit",
      label: "سود خالص",
      value: sum(series, "netProfit"),
      color: "var(--chart-3)",
    },
  ];
}
