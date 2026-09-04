// src/features/warehouse/units/services/api-mockData.js
import { allProducts } from "@/features/warehouse/products/services/mockData";
import { allProductUnits, UNIT_STATUSES } from "./mockData";
import { BarcodeReferenceKindEnum } from "@/shared/domain/enums/barcodeReferenceKind";
import { parseBarcode, toPayload } from "@/shared/services/barcode/productCode";

/**
 * قرینه‌ی mockِ دو endpointِ دانه‌ها (`GetProductUnitList` و
 * `ScanBarcode`) به‌علاوه‌ی چرخه‌ی عمرِ دانه در جریان فروش.
 *
 * چیزی که اینجا **نیست** عمدی است: ساخت دستیِ دانه، ثبتِ چاپ، اصلاحِ
 * دستیِ وضعیت و آمارِ «نیازمند برچسب» هیچ‌کدام معادلی در بکند ندارند.
 * دانه اثرِ جانبیِ موجودی است، نه موجودیتی که مستقیم ساخته یا ویرایش
 * شود.
 */

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const paginate = (rows, page, limit) => ({
  items: rows.slice((page - 1) * limit, (page - 1) * limit + limit),
  total: rows.length,
  page,
  totalPages: Math.ceil(rows.length / limit) || 1,
});

const sortRows = (rows, sortBy, sortOrder) => {
  const dir = sortOrder === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    let aVal = a[sortBy];
    let bVal = b[sortBy];

    if (sortBy === "createdAt" || sortBy === "updatedAt" || sortBy === "soldAt") {
      aVal = aVal ? new Date(aVal).getTime() : 0;
      bVal = bVal ? new Date(bVal).getTime() : 0;
    } else if (typeof aVal === "string") {
      return aVal.localeCompare(bVal ?? "", "fa") * dir;
    }

    return ((aVal ?? 0) > (bVal ?? 0) ? 1 : -1) * dir;
  });
};

export const fetchProductUnits = async (params = {}) => {
  await delay(400);

  const {
    page = 1,
    limit = 10,
    search = "",
    productId = "",
    status = "",
    sortBy = "createdAt",
    sortOrder = "desc",
  } = params;

  let rows = [...allProductUnits];

  if (search) {
    const s = search.toLowerCase();
    rows = rows.filter(
      (u) =>
        u.barcode.toLowerCase().includes(s) ||
        u.barcodePayload.includes(s) ||
        (u.productName ?? "").toLowerCase().includes(s) ||
        (u.productCode ?? "").toLowerCase().includes(s),
    );
  }

  if (productId) rows = rows.filter((u) => Number(u.productId) === Number(productId));
  if (status) rows = rows.filter((u) => u.status === status);

  return paginate(sortRows(rows, sortBy, sortOrder), page, limit);
};

/**
 * تشخیص اینکه کد اسکن‌شده چیست — مسیر «اسکن کن و برو».
 *
 * انباردار جلوی پرینتر به‌سادگی بارکد خودِ کالا را به‌جای بارکد واحد
 * اسکن می‌کند (هر دو روی جنس چسبیده‌اند). در آن حالت پیام «پیدا نشد»
 * گمراه‌کننده است؛ باید بگوییم این بارکدِ کالاست و راه درست را نشان
 * بدهیم.
 */
export const resolveScannedCode = async (code) => {
  await delay(200);

  // شکل و نامِ فیلد اینجا دقیقاً باید مثل پاسخ واقعی api/Product/ScanBarcode
  // باشد (`kind`، نه `type`؛ عدد، نه رشته). تفسیرِ خودِ کد هم با همان
  // منطقِ سرور انجام می‌شود (`parseBarcode`)، نه با تطبیقِ رشته‌ای: پس
  // خط‌تیره داشتن یا نداشتنِ ورودی هیچ فرقی نمی‌کند.
  const reference = parseBarcode(code);

  if (reference.kind === BarcodeReferenceKindEnum.UNIT) {
    const unit = allProductUnits.find(
      (u) => u.barcodePayload === reference.normalizedPayload,
    );
    if (unit) {
      return {
        kind: BarcodeReferenceKindEnum.UNIT,
        normalizedPayload: reference.normalizedPayload,
        unit,
      };
    }
  }

  if (reference.kind === BarcodeReferenceKindEnum.PRODUCT) {
    const product = allProducts.find(
      (p) => toPayload(p.code) === reference.normalizedPayload,
    );
    if (product) {
      return {
        kind: BarcodeReferenceKindEnum.PRODUCT,
        normalizedPayload: reference.normalizedPayload,
        product,
      };
    }
  }

  return {
    kind: BarcodeReferenceKindEnum.UNKNOWN,
    normalizedPayload: reference.normalizedPayload,
  };
};

/* -------------------------------------------------------------------- */
/* چرخه‌ی عمر دانه در جریان فروش                                          */
/*                                                                      */
/* فروش بر پایه‌ی «تعداد» است و کاربر دانه‌ها را دستی انتخاب نمی‌کند؛   */
/* پس مصرف به‌صورت FIFO انجام می‌شود — همان کاری که                      */
/* `ProductUnitService.ConsumeAsync` بدون بارکدِ صریح می‌کند.            */
/*                                                                      */
/* «ارسال» وضعیت جدایی نمی‌سازد: بکند فقط IN_STOCK → SOLD دارد و        */
/* خروج از انبار همان مصرف است.                                         */
/* -------------------------------------------------------------------- */

const touch = (unit, patch) => ({
  ...unit,
  ...patch,
  updatedAt: new Date().toISOString(),
});

/**
 * ترتیب FIFO صریح است، نه ترتیب آرایه: واحدهای تازه با unshift به ابتدا
 * اضافه می‌شوند، پس پیمایش خام آرایه دقیقاً برعکس FIFO عمل می‌کند.
 */
const oldestFirst = (predicate) =>
  allProductUnits
    .map((unit, index) => ({ unit, index }))
    .filter(({ unit }) => predicate(unit))
    .sort(
      (a, b) =>
        new Date(a.unit.createdAt).getTime() -
        new Date(b.unit.createdAt).getTime(),
    );

export function allocateUnitsForSale(saleId, items = []) {
  items.forEach(({ productId, quantity }) => {
    const needed = Number(quantity) || 0;
    if (needed <= 0) return;

    const candidates = oldestFirst(
      (unit) =>
        Number(unit.productId) === Number(productId) &&
        unit.status === UNIT_STATUSES.IN_STOCK,
    ).slice(0, needed);

    candidates.forEach(({ unit, index }) => {
      allProductUnits[index] = touch(unit, {
        status: UNIT_STATUSES.SOLD,
        saleId,
        soldAt: new Date().toISOString(),
      });
    });
  });
}

/**
 * لغو فروش: دانه‌های مصرف‌شده دوباره به انبار برمی‌گردند — قرینه‌ی
 * `ProductUnitService.RestoreAsync`.
 */
export function releaseUnitsForSale(saleId) {
  allProductUnits.forEach((unit, index) => {
    if (Number(unit.saleId) !== Number(saleId)) return;
    if (unit.status !== UNIT_STATUSES.SOLD) return;

    allProductUnits[index] = touch(unit, {
      status: UNIT_STATUSES.IN_STOCK,
      saleId: null,
      soldAt: null,
    });
  });
}
