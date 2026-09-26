import {
  PREVIOUS_PERIOD_LABELS,
  formatPeriodLabel,
  formatPeriodRange,
} from "@/shared/domain/enums/reportPeriod";
import { periodOverPeriodChange, sparkOf, sumOf } from "./dashboardMetrics";

/**
 * مشتقاتِ گزارشِ محدوده‌دار (`GetScopePerformance` — «من»، «تیم من»،
 * «واحد من»).
 *
 * این گزارش عمداً فقط **مبلغ و تعدادِ فاکتور** دارد، نه درآمد و سود:
 * سود از بهای تمام‌شده می‌آید و آن عدد مالِ کسی است که `ReportView` دارد.
 * مسئولِ یک تیمِ فروش باید بداند تیمش چقدر فروخته، نه حاشیه‌ی سودِ کلِ
 * شرکت را.
 *
 * شکلِ سری همان شکلِ `buildPeriodSeries` است (`{ key, label, values }`)
 * تا همان نمودارها و `KpiCard` بدونِ تغییر رویش کار کنند.
 */
export function buildScopeSeries(periods = [], periodType) {
  const rows = periods
    .map((period) => ({
      key: String(period.periodStart),
      periodStart: period.periodStart,
      periodEnd: period.periodEnd,
      label: formatPeriodLabel(period.periodStart, periodType),
      tooltipLabel: formatPeriodRange(period.periodStart, period.periodEnd),
      values: {
        salesCount: Number(period.salesCount) || 0,
        saleInvoiceAmount: Number(period.saleInvoiceAmount) || 0,
        purchasesCount: Number(period.purchasesCount) || 0,
        purchaseInvoiceAmount: Number(period.purchaseInvoiceAmount) || 0,
      },
    }))
    .sort((a, b) => (String(a.periodStart) < String(b.periodStart) ? -1 : 1));

  const last = rows[rows.length - 1];
  if (last?.periodEnd && new Date(last.periodEnd) > new Date()) {
    last.isOpen = true;
    last.tooltipLabel = `${last.tooltipLabel} — هنوز تمام نشده`;
  }
  return rows;
}

const SALE_KPIS = [
  {
    key: "saleInvoiceAmount",
    label: "مبلغ فروش",
    hint: "جمعِ مبلغ فاکتورهای فروش بر اساس تاریخ فاکتور",
    format: "amount",
    unit: "ریال",
    color: "var(--chart-1)",
  },
  {
    key: "salesCount",
    label: "تعداد فروش",
    hint: "تعداد فاکتورهای فروشِ ثبت‌شده (پیش‌فاکتورِ بدونِ تاریخِ فاکتور حساب نمی‌شود)",
    format: "count",
    color: "var(--chart-2)",
  },
];

const PURCHASE_KPIS = [
  {
    key: "purchaseInvoiceAmount",
    label: "مبلغ خرید",
    hint: "جمعِ مبلغ فاکتورهای خرید بر اساس تاریخ فاکتور",
    format: "amount",
    unit: "ریال",
    color: "var(--chart-4)",
  },
  {
    key: "purchasesCount",
    label: "تعداد خرید",
    hint: "تعداد فاکتورهای خریدِ ثبت‌شده (پیش‌فاکتورِ بدونِ تاریخِ فاکتور حساب نمی‌شود)",
    format: "count",
    color: "var(--chart-5)",
  },
];

/**
 * کدام طرف (فروش/خرید) نشان داده شود.
 *
 * برای «من»، از روی دسترسی: فروشنده‌ای که هیچ‌وقت خرید ثبت نمی‌کند نباید
 * دو کارتِ صفرِ خرید ببیند. برای تیم و واحد، از روی داده: اعضای یک واحد
 * کارهای مختلف می‌کنند و هر طرفی که در بازه عددی دارد معنا دارد. اگر هیچ
 * طرفی عدد نداشت، هر دو می‌مانند تا «صفر» صادقانه دیده شود نه کارتِ خالی.
 */
export function scopeSides(series, { sells, buys, isPersonal }) {
  const hasSales = sumOf(series, "salesCount") > 0;
  const hasPurchases = sumOf(series, "purchasesCount") > 0;

  let showSales = isPersonal ? sells || hasSales : hasSales;
  let showPurchases = isPersonal ? buys || hasPurchases : hasPurchases;
  if (!showSales && !showPurchases) {
    showSales = true;
    showPurchases = true;
  }
  return { showSales, showPurchases };
}

export function buildScopeKpis(series, periodType, sides) {
  const comparison = PREVIOUS_PERIOD_LABELS[periodType] ?? "بازه قبل";
  const defs = [
    ...(sides.showSales ? SALE_KPIS : []),
    ...(sides.showPurchases ? PURCHASE_KPIS : []),
  ];

  return defs.map((def) => ({
    ...def,
    value: sumOf(series, def.key),
    change: periodOverPeriodChange(series, def.key),
    spark: sparkOf(series, def.key),
    direction: "up",
    comparison,
  }));
}

/** سطرهای جدولِ اعضا — پرفروش‌ترین بالا، و سهمِ هرکس از جمعِ محدوده. */
export function rankMembers(members = [], sides) {
  const key = sides.showSales ? "saleInvoiceAmount" : "purchaseInvoiceAmount";
  const total = members.reduce((acc, m) => acc + (Number(m[key]) || 0), 0);

  return [...members]
    .sort((a, b) => (Number(b[key]) || 0) - (Number(a[key]) || 0))
    .map((member) => ({
      ...member,
      share: total > 0 ? ((Number(member[key]) || 0) / total) * 100 : 0,
    }));
}
