import { ProductUnitStatusEnum as UNIT_STATUSES } from "@/shared/domain/enums/unitStatus";
import { parseBarcode } from "@/shared/domain/barcode/productCode";
import { BarcodeReferenceKindEnum } from "@/shared/domain/enums/barcodeReferenceKind";

/**
 * شمارشِ دانه‌ای (cycle count) — مقایسه‌ی قفسه با دفترِ دانه‌ها.
 *
 * انباردار یک کالا را انتخاب و همه‌ی دانه‌های روی قفسه را اسکن می‌کند.
 * سه نتیجه:
 *  - **شمرده‌شده:** در سیستم «در انبار» است و روی قفسه هم هست.
 *  - **پیدانشده:** سیستم می‌گوید در انبار است ولی اسکن نشد (گم‌شده،
 *    جابه‌جا، یا برچسبش افتاده).
 *  - **غیرمنتظره:** اسکن شد ولی سیستم آن را «در انبار»ِ این کالا نمی‌داند
 *    (کالای دیگر، فروخته، اسقاط، یا اصلاً ثبت‌نشده).
 *
 * تشخیصِ «متعلق به این شمارش هست یا نه» کاملاً محلی است — بارکدِ دانه
 * شناسه‌ی کالا و سریال را در خودش دارد — و فقط غیرمنتظره‌ها برای روشن
 * شدنِ وضعیتشان به سرور می‌روند.
 */

/** فقط دانه‌ی «در انبار» باید روی قفسه باشد؛ قرنطینه جای جدایی دارد. */
export const STOCKTAKE_EXPECTED_STATUSES = Object.freeze([UNIT_STATUSES.IN_STOCK]);

export const SCAN_OUTCOMES = Object.freeze({
  COUNTED: "counted",
  DUPLICATE: "duplicate",
  UNEXPECTED: "unexpected",
  INVALID: "invalid",
});

/**
 * یک اسکن را نسبت به فهرستِ انتظار دسته‌بندی می‌کند.
 * @param expectedByPayload Map از payload به دانه‌ی مورد انتظار
 * @param counted Set از payloadهای شمرده‌شده
 */
export function classifyScan(code, expectedByPayload, counted) {
  const reference = parseBarcode(code);

  if (reference.kind !== BarcodeReferenceKindEnum.UNIT) {
    return { outcome: SCAN_OUTCOMES.INVALID, reference };
  }
  if (counted.has(reference.normalizedPayload)) {
    return { outcome: SCAN_OUTCOMES.DUPLICATE, reference };
  }
  if (expectedByPayload.has(reference.normalizedPayload)) {
    return {
      outcome: SCAN_OUTCOMES.COUNTED,
      reference,
      unit: expectedByPayload.get(reference.normalizedPayload),
    };
  }
  return { outcome: SCAN_OUTCOMES.UNEXPECTED, reference };
}

/** نتیجه‌ی کلِ شمارش از روی عکسِ انتظار و اسکن‌ها. */
export function summarizeStocktake(expectedUnits, countedPayloads, unexpected) {
  const counted = [];
  const missing = [];
  for (const unit of expectedUnits) {
    (countedPayloads.has(unit.barcodePayload) ? counted : missing).push(unit);
  }
  const expected = expectedUnits.length;
  return {
    expected,
    counted,
    missing,
    unexpected,
    progress: expected > 0 ? counted.length / expected : 0,
    isClean: missing.length === 0 && unexpected.length === 0,
  };
}
