// src/features/dashboard/services/api-mockData.js
import DateObject from "react-date-object";
import persian from "react-date-object/calendars/persian";
import gregorian from "react-date-object/calendars/gregorian";
import { dailyActivity } from "./mockData";
import {
  DEFAULT_REPORT_PERIOD,
  ReportPeriodTypeEnum,
} from "@/shared/domain/enums/reportPeriod";

/**
 * نسخه‌ی mockِ `api/Report` (بخش ۱۸ سند).
 *
 * سطحِ این ماژول عمداً مو‌به‌مو همان `api-v1` است: دو تابع، همان
 * آرگومان‌ها، و خروجی‌ای با *همان* نامِ فیلدها که سرور می‌دهد
 * (`periodStart`، `netProfit`، …). هر «بهبودِ» کوچکی در شکلِ خروجیِ
 * mock — مثلاً افزودنِ `label` آماده — روز مهاجرت به یک باگِ خاموش
 * تبدیل می‌شود؛ مشتقات جای دیگری ساخته می‌شوند (`domain/dashboardMetrics`).
 *
 * برخلافِ بقیه‌ی فهرست‌ها، این دو endpoint صفحه‌بندی ندارند و کلِ بازه
 * را یک‌جا برمی‌گردانند.
 */

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ─── گروه‌بندی در بازه‌ها ───────────────────────────────────────────────────

/**
 * این بخش همان کاری است که روز مهاجرت `ReportController` انجام می‌دهد.
 * اینجا هست تا داده‌ی ساختگی هم واقعاً به تغییرِ `periodType` واکنش
 * نشان دهد؛ اگر mock صرفاً یک فهرستِ ثابتِ ماهانه برمی‌گرداند، کلیدهای
 * «روزانه/فصلی/سالانه» در UI بی‌اثر می‌ماندند و ایرادشان تازه بعد از
 * وصل‌شدن به سرور پیدا می‌شد.
 *
 * عمداً در همین فایل مانده و ماژولِ جدا نشده: هیچ‌کس بیرون از mock به
 * آن نیاز ندارد و روزی که به سرور وصل شویم، با همین فایل حذف می‌شود.
 *
 * مرزها بر اساس تقویمِ **شمسی** حساب می‌شوند (همان قراردادِ بخش ۱۸)،
 * ولی خروجی مثل خودِ سرور میلادی است.
 */

const ISO = (date) => date.toISOString().slice(0, 10);

const fromISO = (iso) => new Date(`${iso}T00:00:00Z`);

const toPersian = (iso) =>
  new DateObject({
    date: iso,
    calendar: gregorian,
    format: "YYYY-MM-DD",
  }).convert(persian);

const toISOFromPersian = (year, month, day) =>
  new DateObject({ calendar: persian, year, month, day })
    .convert(gregorian)
    .format("YYYY-MM-DD");

/**
 * شروعِ بازه‌ای که این روز داخلش می‌افتد.
 *
 * هفته از **شنبه** شروع می‌شود. فاصله تا شنبه از روی `getUTCDay`
 * جاوااسکریپت حساب می‌شود (یکشنبه=۰ … شنبه=۶) نه از localeِ تقویم، چون
 * locale می‌تواند جای دیگری عوض شود و این محاسبه بی‌صدا یک روز جابه‌جا
 * شود.
 */
function periodStartOf(isoDate, periodType) {
  const type = Number(periodType);

  if (type === ReportPeriodTypeEnum.DAILY) return isoDate;

  if (type === ReportPeriodTypeEnum.WEEKLY) {
    const date = fromISO(isoDate);
    date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 1) % 7));
    return ISO(date);
  }

  const d = toPersian(isoDate);
  const year = d.year;
  const month = d.month.number;

  switch (type) {
    case ReportPeriodTypeEnum.QUARTERLY:
      return toISOFromPersian(year, Math.floor((month - 1) / 3) * 3 + 1, 1);
    case ReportPeriodTypeEnum.SEMI_ANNUAL:
      return toISOFromPersian(year, month <= 6 ? 1 : 7, 1);
    case ReportPeriodTypeEnum.ANNUAL:
      return toISOFromPersian(year, 1, 1);
    case ReportPeriodTypeEnum.MONTHLY:
    default:
      return toISOFromPersian(year, month, 1);
  }
}

/** مرزِ *باز* بازه — یعنی شروعِ بازه‌ی بعدی، عیناً مثل پاسخِ سرور. */
function periodEndOf(startISO, periodType) {
  const type = Number(periodType);

  if (
    type === ReportPeriodTypeEnum.DAILY ||
    type === ReportPeriodTypeEnum.WEEKLY
  ) {
    const date = fromISO(startISO);
    date.setUTCDate(
      date.getUTCDate() + (type === ReportPeriodTypeEnum.DAILY ? 1 : 7),
    );
    return ISO(date);
  }

  const months =
    type === ReportPeriodTypeEnum.QUARTERLY
      ? 3
      : type === ReportPeriodTypeEnum.SEMI_ANNUAL
        ? 6
        : type === ReportPeriodTypeEnum.ANNUAL
          ? 12
          : 1;

  const d = toPersian(startISO);
  const totalMonths = d.month.number - 1 + months;
  return toISOFromPersian(
    d.year + Math.floor(totalMonths / 12),
    (totalMonths % 12) + 1,
    1,
  );
}

/**
 * جمع‌بندیِ ردیف‌های روزانه در بازه‌ها.
 *
 * ترتیبِ خروجی زمانی است (قدیمی به جدید) — نمودار روی همین ترتیب حساب
 * می‌کند و مرتب‌سازیِ دوباره در لایه‌ی UI یعنی همان منطق در دو جا.
 */
function groupByPeriod(rows, periodType, metrics) {
  const buckets = new Map();

  for (const row of rows) {
    const start = periodStartOf(row.date, periodType);
    let bucket = buckets.get(start);
    if (!bucket) {
      bucket = {
        periodStart: `${start}T00:00:00`,
        periodEnd: `${periodEndOf(start, periodType)}T00:00:00`,
      };
      for (const metric of metrics) bucket[metric] = 0;
      buckets.set(start, bucket);
    }
    for (const metric of metrics) {
      bucket[metric] += Number(row[metric]) || 0;
    }
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([, bucket]) => bucket);
}

// ─── endpointها ─────────────────────────────────────────────────────────────

/** پیش‌فرضِ سرور وقتی بازه‌ای نفرستیم: ۱۲ ماهِ اخیر. */
function defaultRange() {
  const to = new Date();
  to.setUTCHours(0, 0, 0, 0);
  const from = new Date(to);
  from.setUTCMonth(from.getUTCMonth() - 12);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

function rowsInRange({ fromDate, toDate }) {
  const range = defaultRange();
  const from = fromDate || range.from;
  const to = toDate || range.to;
  return dailyActivity.filter((row) => row.date >= from && row.date <= to);
}

export async function fetchSaleReport({
  periodType = DEFAULT_REPORT_PERIOD,
  fromDate = "",
  toDate = "",
} = {}) {
  await delay(450);

  const periods = groupByPeriod(rowsInRange({ fromDate, toDate }), periodType, [
    "salesCount",
    "saleInvoiceAmount",
    "revenue",
    "costOfGoodsSold",
  ]).map((bucket) => ({
    periodStart: bucket.periodStart,
    periodEnd: bucket.periodEnd,
    salesCount: bucket.salesCount,
    totalInvoiceAmount: bucket.saleInvoiceAmount,
    revenue: bucket.revenue,
    costOfGoodsSold: bucket.costOfGoodsSold,
    // سرور هم `netProfit` را همین‌طور می‌سازد؛ اینجا حسابش می‌کنیم تا
    // مصرف‌کننده بین mock و سرور تفاوتی نبیند.
    netProfit: bucket.revenue - bucket.costOfGoodsSold,
  }));

  return { periods };
}

export async function fetchPurchaseReport({
  periodType = DEFAULT_REPORT_PERIOD,
  fromDate = "",
  toDate = "",
} = {}) {
  await delay(450);

  const periods = groupByPeriod(rowsInRange({ fromDate, toDate }), periodType, [
    "purchasesCount",
    "purchaseInvoiceAmount",
    "totalReceivedValue",
  ]).map((bucket) => ({
    periodStart: bucket.periodStart,
    periodEnd: bucket.periodEnd,
    purchasesCount: bucket.purchasesCount,
    totalInvoiceAmount: bucket.purchaseInvoiceAmount,
    totalReceivedValue: bucket.totalReceivedValue,
  }));

  return { periods };
}
