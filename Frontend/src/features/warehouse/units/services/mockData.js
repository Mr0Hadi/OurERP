// src/features/warehouse/units/services/mockData.js

/**
 * «واحد کالا» = یک قلم فیزیکیِ مشخص در انبار، نه یک SKU.
 *
 * هر ردیف اینجا یک جسم واقعی است که برچسب بارکد رویش چسبیده و از
 * لحظه‌ی ورود تا خروج قابل ردیابی است. این با بارکد سطح کالا
 * (product.barcode) فرق دارد: آن یکی برای همه‌ی نمونه‌های یک کالا
 * مشترک است.
 *
 * موجودی عددی (product.stock) همچنان مرجع تعداد است؛ این جدول یک
 * دفترِ موازیِ برچسب‌گذاری و ردیابی است. «چند واحد بی‌برچسب مانده» از
 * تفاضل همین دو به دست می‌آید.
 */
export {
  ProductUnitStatusEnum as UNIT_STATUSES,
  UNIT_STATUS_LABELS,
  MANUAL_UNIT_STATUSES,
} from "@/shared/domain/enums/unitStatus";
import { ProductUnitStatusEnum as UNIT_STATUSES } from "@/shared/domain/enums/unitStatus";

/** واحدهایی که فیزیکاً در انبار موجودند و باید در موجودی شمرده شوند. */
export const isCountedInStock = (status) => status === UNIT_STATUSES.IN_STOCK;

export const UNIT_SOURCE_TYPES = {
  PURCHASE: "purchase",
  SALES_RETURN: "sales_return",
  MANUAL: "manual",
};

export const UNIT_SOURCE_TYPE_LABELS = {
  [UNIT_SOURCE_TYPES.PURCHASE]: "خرید",
  [UNIT_SOURCE_TYPES.SALES_RETURN]: "مرجوعی فروش",
  [UNIT_SOURCE_TYPES.MANUAL]: "ثبت دستی",
};

const seedUnit = (seq, overrides) => ({
  id: `u-${String(seq).padStart(5, "0")}`,
  unitCode: `U-050520-0001-${String(seq).padStart(5, "0")}`,
  productId: 1,
  productCode: "BRK-1001",
  productName: "لنت ترمز جلو",
  status: UNIT_STATUSES.IN_STOCK,
  // تاریخ چاپ اول هرگز عوض نمی‌شود؛ چاپ مجدد فقط lastPrintedAt و
  // printCount را جلو می‌برد. برچسبِ افتاده یا خراب باید دوباره چاپ
  // شود بدون اینکه سابقه‌ی چاپ اولش گم شود.
  firstPrintedAt: "2026-08-11T09:00:00Z",
  lastPrintedAt: "2026-08-11T09:00:00Z",
  printCount: 1,
  source: { type: UNIT_SOURCE_TYPES.PURCHASE, refId: 1, refNumber: "PUR-2026-001" },
  saleId: null,
  createdAt: "2026-08-11T08:30:00Z",
  updatedAt: "2026-08-11T09:00:00Z",
  ...overrides,
});

/**
 * چند واحد نمونه برای کالای ۱، تا صفحه از همان اول هر سه حالت
 * «برچسب‌خورده / بی‌برچسب / خارج‌شده از انبار» را نشان بدهد.
 */
export const allProductUnits = [
  seedUnit(1),
  seedUnit(2),
  seedUnit(3),
  seedUnit(4, { firstPrintedAt: null, lastPrintedAt: null, printCount: 0 }),
  seedUnit(5, { firstPrintedAt: null, lastPrintedAt: null, printCount: 0 }),
  seedUnit(6, { status: UNIT_STATUSES.SOLD, saleId: 1 }),
  seedUnit(7, { status: UNIT_STATUSES.SOLD, saleId: 1 }),
  seedUnit(8, { status: UNIT_STATUSES.SHIPPED, saleId: 1 }),
];
