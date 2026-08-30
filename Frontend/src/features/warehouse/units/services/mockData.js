// src/features/warehouse/units/services/mockData.js

/**
 * «واحد کالا» = یک قلم فیزیکیِ مشخص در انبار، نه یک SKU.
 *
 * هر ردیف اینجا یک جسم واقعی است که برچسب بارکد رویش چسبیده و از
 * لحظه‌ی ورود تا خروج قابل ردیابی است. این با بارکد سطح کالا
 * (product.barcode) فرق دارد: آن یکی برای همه‌ی نمونه‌های یک کالا
 * مشترک است.
 *
 * سرور تعدادِ دانه‌های `IN_STOCK` را همیشه با `product.stock` هم‌تراز
 * نگه می‌دارد (`ProductUnitService.ReconcileStockAsync`)، پس این جدول
 * دفترِ موازی نیست — همان موجودی است، دانه‌به‌دانه.
 */
import { allProducts } from "@/features/warehouse/products/services/mockData";
import {
  buildUnitBarcode,
  toPayload,
} from "@/shared/services/barcode/productCode";

export {
  ProductUnitStatusEnum as UNIT_STATUSES,
  UNIT_STATUS_LABELS,
} from "@/shared/domain/enums/unitStatus";
import { ProductUnitStatusEnum as UNIT_STATUSES } from "@/shared/domain/enums/unitStatus";

/** واحدهایی که فیزیکاً در انبار موجودند و باید در موجودی شمرده شوند. */
export const isCountedInStock = (status) => status === UNIT_STATUSES.IN_STOCK;

const seedProduct = allProducts.find((product) => Number(product.id) === 1);

/**
 * شماره‌ی سریال per-product است و از ۱ شروع می‌شود — نه یک شمارنده‌ی
 * سراسری. بارکد هم از روی *کدِ همان کالا* ساخته می‌شود، دقیقاً مثل
 * `ProductUnitService.MintAsync`؛ به همین دلیل کدِ کالا اینجا هاردکد
 * نشده و از خودِ mockِ کالاها خوانده می‌شود.
 */
const seedUnit = (serialNumber, overrides) => {
  const barcode = buildUnitBarcode(seedProduct.code, serialNumber);

  return {
    id: serialNumber,
    productId: seedProduct.id,
    serialNumber,
    // خوانا برای نمایش، payload برای میله‌ها و برای مقایسه هنگام اسکن.
    barcode,
    barcodePayload: toPayload(barcode),
    productCode: seedProduct.code,
    productName: seedProduct.name,
    status: UNIT_STATUSES.IN_STOCK,
    // بکند دانه را به *خطِ* فروش وصل می‌کند (`SaleItemId`)؛ mock هنوز فقط
    // شناسه‌ی خودِ فروش را در دست دارد، پس هر دو نگه داشته می‌شوند و UI
    // هرکدام که پر باشد را نشان می‌دهد.
    saleItemId: null,
    saleId: null,
    purchaseItemId: 1,
    createdAt: "2026-08-11T08:30:00Z",
    soldAt: null,
    updatedAt: "2026-08-11T09:00:00Z",
    ...overrides,
  };
};

/**
 * چند دانه‌ی نمونه برای کالای ۱، تا صفحه از همان اول هر سه وضعیتی را
 * که سرور واقعاً تولید می‌کند نشان بدهد: در انبار، فروخته‌شده، اسقاط.
 */
export const allProductUnits = [
  seedUnit(1),
  seedUnit(2),
  seedUnit(3),
  seedUnit(4),
  seedUnit(5),
  seedUnit(6, { status: UNIT_STATUSES.SOLD, saleId: 1 }),
  seedUnit(7, { status: UNIT_STATUSES.SOLD, saleId: 1 }),
  seedUnit(8, { status: UNIT_STATUSES.SCRAPPED }),
];
