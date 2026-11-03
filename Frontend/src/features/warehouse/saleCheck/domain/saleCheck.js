import { UnitActionReasonEnum } from "@/features/warehouse/units/domain/unitVocabulary";
import { formatNumber } from "@/shared/lib/numberFormat";

/**
 * قاعده‌های بررسیِ انبارِ پیش‌فاکتور. انباردار یا همان را تأیید می‌کند، یا تعدادِ ردیف‌ها را
 * (تا حذفِ ردیف) کم می‌کند — با دلیلِ نوشته‌شده — و همان را تأیید می‌کند. ردیفِ کالای ردیابی‌دار
 * دقیقاً به‌اندازه‌ی کسریِ رزروش اسکن می‌خواهد؛ کالای بی‌ردیابی یا کامل اسکن می‌شود یا اصلاً نه —
 * آن‌وقت سرور قدیمی‌ترین دانه‌های آزاد را رزرو می‌کند (`CheckSaleWarehouse`، بخش ۱۱ سند و ۲۹.۱).
 */

/** علت‌های گزارشِ دانه‌ی معیوب؛ مفقود جدا انتخاب می‌شود. `INSPECTION_PASSED` پذیرفته نیست. */
export const DEFECT_REASONS = [
  UnitActionReasonEnum.DAMAGED_IN_WAREHOUSE,
  UnitActionReasonEnum.DEFECT_FOUND,
  UnitActionReasonEnum.EXPIRED,
  UnitActionReasonEnum.NEEDS_INSPECTION,
  UnitActionReasonEnum.OTHER,
];

/** تعدادِ تأییدیِ ردیف: تغییرِ انبار، یا همان سفارش. */
export const approvedQuantity = (item, quantities) => quantities[item.id] ?? (Number(item.quantity) || 0);

const isLineChanged = (item, quantities) => approvedQuantity(item, quantities) !== (Number(item.quantity) || 0);

/**
 * چند دانه‌ی این ردیف باید اسکن شود. ردیفِ تغییرکرده رزروش را از دست می‌دهد (سرور با تغییرِ
 * تعداد دانه‌های رزروِ همان ردیف را آزاد می‌کند)، پس همه‌اش از نو؛ بقیه فقط کسریِ رزرو.
 */
export function lineNeed(item, quantities = {}) {
  const quantity = approvedQuantity(item, quantities);
  return isLineChanged(item, quantities) ? quantity : Math.max(0, quantity - (Number(item.reservedQuantity) || 0));
}

/** کالای بی‌ردیابی: اسکن اختیاری است و بی‌اسکن، سرور خودش رزرو می‌کند. */
export const scanOptional = (item) => item.requiresUnitTracking === false;

/**
 * ردیف از نظرِ اسکن آماده است؟ کامل اسکن شده، یا کالای بی‌ردیابیِ بی‌اسکن. اسکنِ نیمه‌کاره‌ی کالای
 * بی‌ردیابی را سرور «کسری» ثبت می‌کند (بقیه را خودش رزرو نمی‌کند)، پس مانع است.
 */
export function lineReady(item, scannedCount, need) {
  return scannedCount >= need || (scanOptional(item) && scannedCount === 0);
}

/** چند دانه با این تأیید رزرو می‌شود: اسکن‌شده‌ها، و کلِ نیازِ ردیفِ بی‌ردیابیِ بی‌اسکن. */
export function reservedOnApproval(items, { scans, quantities }) {
  return items.reduce((sum, item) => {
    if (approvedQuantity(item, quantities) === 0) return sum;
    const scanned = scans[item.id]?.length ?? 0;
    return sum + (scanOptional(item) && scanned === 0 ? lineNeed(item, quantities) : scanned);
  }, 0);
}

/**
 * وضعیتِ فرم و نخستین دلیلی که ثبت را می‌بندد.
 * @param scans      `{ [saleItemId]: string[] }`
 * @param quantities `{ [saleItemId]: number }` — فقط ردیف‌های تغییرکرده
 */
export function checkSummary(items, { scans, quantities, issues, reason, canEdit }) {
  const changed = items.filter((item) => isLineChanged(item, quantities));
  const remaining = items.filter((item) => approvedQuantity(item, quantities) > 0);
  const unscanned = remaining.filter((item) => !lineReady(item, scans[item.id]?.length ?? 0, lineNeed(item, quantities)));
  const reported = new Set(issues.map((issue) => issue.productUnitBarcode));
  const doubled = items.find((item) => (scans[item.id] || []).some((code) => reported.has(code)));

  let blockingReason = null;
  if (doubled) {
    blockingReason = `دانه‌ای از «${doubled.productName}» هم اسکن و هم گزارشِ معیوب شده؛ یکی را بردارید.`;
  } else if (remaining.length === 0) {
    blockingReason = "همه‌ی اقلام صفر شده؛ چنین پیش‌فاکتوری باید به فروش برگردد تا حذف شود.";
  } else if (changed.length > 0 && !reason.trim()) {
    blockingReason = "دلیلِ تغییر را بنویسید.";
  } else if (unscanned.length > 0) {
    const item = unscanned[0];
    blockingReason = scanOptional(item)
      ? `«${item.productName}»: یا همه‌ی ${formatNumber(lineNeed(item, quantities))} دانه را اسکن کنید، یا اسکن‌ها را بردارید تا انبار خودش رزرو کند.`
      : canEdit
      ? `«${item.productName}»: ${formatNumber(scans[item.id]?.length ?? 0)} از ${formatNumber(lineNeed(item, quantities))} دانه اسکن شده؛ بقیه را اسکن کنید یا تعداد را کم کنید.`
      : `«${item.productName}»: ${formatNumber(scans[item.id]?.length ?? 0)} از ${formatNumber(lineNeed(item, quantities))} دانه اسکن شده.`;
  }
  return { changed, unscanned, blockingReason };
}

/** متنِ پیشنهادیِ دلیل («نام: ۲ ← ۱»). */
export function changeDraft(changed, quantities) {
  return changed
    .map((item) => `«${item.productName}»: ${formatNumber(item.quantity)} ← ${formatNumber(approvedQuantity(item, quantities))}`)
    .join("، ");
}
