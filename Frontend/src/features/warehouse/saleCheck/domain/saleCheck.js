import { UnitActionReasonEnum } from "@/features/warehouse/units/domain/unitVocabulary";
import { formatNumber } from "@/shared/lib/numberFormat";

/**
 * قاعده‌های بررسیِ انبارِ پیش‌فاکتور (`CheckSaleWarehouse`، بخش ۱۱ سند): هر ردیف دقیقاً
 * به‌اندازه‌ی کسریِ رزروش بارکد می‌خواهد (کمتر = کسری، بیشتر ۴۰۰)؛ هر کسری‌ای یعنی هیچ دانه‌ای
 * رزرو نمی‌شود و پیش‌فاکتور با یادداشت به فروش برمی‌گردد.
 */

/** علت‌های گزارشِ دانه‌ی معیوب؛ مفقود جدا انتخاب می‌شود (اسکن‌شدنی نیست). `INSPECTION_PASSED` پذیرفته نیست. */
export const DEFECT_REASONS = [
  UnitActionReasonEnum.DAMAGED_IN_WAREHOUSE,
  UnitActionReasonEnum.DEFECT_FOUND,
  UnitActionReasonEnum.EXPIRED,
  UnitActionReasonEnum.NEEDS_INSPECTION,
  UnitActionReasonEnum.OTHER,
];

/** چند دانه‌ی این ردیف هنوز باید اسکن شود (از بررسیِ قبلی شاید بخشی رزرو مانده). */
export const lineNeed = (item) => Math.max(0, (Number(item.quantity) || 0) - (Number(item.reservedQuantity) || 0));

/**
 * وضعیتِ فرم: ردیف‌های ناقص و اینکه ثبت ممکن است یا نه.
 * @param scans  `{ [saleItemId]: string[] }`
 * @param issues `[{ productUnitBarcode }]`
 */
export function checkSummary(items, scans, issues, note) {
  const short = items.filter((item) => (scans[item.id]?.length ?? 0) < lineNeed(item));
  const complete = short.length === 0;
  const reported = new Set(issues.map((issue) => issue.productUnitBarcode));
  const doubled = items.find((item) => (scans[item.id] || []).some((code) => reported.has(code)));

  let blockingReason = null;
  if (doubled) {
    blockingReason = `دانه‌ای از «${doubled.productName}» هم اسکن و هم گزارشِ معیوب شده؛ یکی را بردارید.`;
  } else if (!complete && !note.trim()) {
    blockingReason = "کسری دارد: دلیلِ کسری را برای فروش بنویسید.";
  }
  return { short, complete, blockingReason };
}

/** متنِ پیشنهادیِ کسری («نام: ۱ از ۲») تا انباردار فقط توضیحش را اضافه کند. */
export function shortageDraft(short, scans) {
  return short
    .map((item) => `«${item.productName}»: ${formatNumber(scans[item.id]?.length ?? 0)} از ${formatNumber(lineNeed(item))}`)
    .join("، ");
}

/** بدنه‌ی `CheckSaleWarehouse`. */
export function buildCheckCommand(sale, scans, issues, note) {
  return {
    saleId: sale.id,
    revision: sale.revision,
    lines: (sale.items || [])
      .filter((item) => lineNeed(item) > 0)
      .map((item) => ({ saleItemId: item.id, productUnitBarcodes: scans[item.id] || [] })),
    issues: issues.map(({ productUnitBarcode, reason, description }) => ({ productUnitBarcode, reason, description })),
    note: note.trim() || null,
  };
}
