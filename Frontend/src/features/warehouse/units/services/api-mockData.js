// src/features/warehouse/units/services/api-mockData.js
import { allProducts } from "@/features/warehouse/products/services/mockData";
import { todayPersianCompact } from "@/shared/utils/dateUtils";
import {
  allProductUnits,
  UNIT_STATUSES,
  UNIT_SOURCE_TYPES,
} from "./mockData";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const UNIT_CODE_PREFIX = "U";

/**
 * شناسه‌ی هر واحد: U-YYMMDD-PPPP-NNNNN
 *
 * - شمارنده سراسری و سمت سرور است، پس یکتایی ساختاری است نه شانسی.
 * - پیشوند U فضای نام واحد را از بارکد سطح کالا (۱۳ رقمِ تماماً عددی)
 *   جدا می‌کند؛ موقع اسکن می‌شود فهمید کدام موجودیت اسکن شده است.
 * - تاریخ و شناسه‌ی کالا داخل کد می‌مانند تا برچسبِ آسیب‌دیده هم با
 *   چشم قابل تشخیص باشد.
 */
const nextUnitSequence = () =>
  allProductUnits.reduce((max, unit) => {
    const tail = String(unit.unitCode ?? "").split("-").pop();
    return /^\d+$/.test(tail) ? Math.max(max, Number(tail)) : max;
  }, 0) + 1;

const buildUnitCode = (productId, sequence) =>
  [
    UNIT_CODE_PREFIX,
    todayPersianCompact("YYMMDD"),
    String(productId).padStart(4, "0"),
    String(sequence).padStart(5, "0"),
  ].join("-");

const countInStockUnits = (productId) =>
  allProductUnits.filter(
    (u) => Number(u.productId) === Number(productId) && u.status === UNIT_STATUSES.IN_STOCK,
  ).length;

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

    if (sortBy === "createdAt" || sortBy === "updatedAt" || sortBy === "printedAt") {
      aVal = aVal ? new Date(aVal).getTime() : 0;
      bVal = bVal ? new Date(bVal).getTime() : 0;
    } else if (typeof aVal === "string") {
      return aVal.localeCompare(bVal ?? "", "fa") * dir;
    }

    return ((aVal ?? 0) > (bVal ?? 0) ? 1 : -1) * dir;
  });
};

/**
 * کالاهایی که موجودی‌شان از تعداد واحدهای برچسب‌خورده بیشتر است —
 * یعنی جنس رسیده ولی هنوز برچسب نخورده.
 */
export const fetchPendingLabelProducts = async (params = {}) => {
  await delay(400);

  const {
    page = 1,
    limit = 10,
    search = "",
    category = "",
    onlyPending = true,
    sortBy = "missingCount",
    sortOrder = "desc",
  } = params;

  let rows = allProducts.map((product) => {
    const labeledCount = countInStockUnits(product.id);
    const stock = product.stock || 0;
    return {
      productId: product.id,
      productCode: product.code,
      productName: product.name,
      category: product.category,
      unit: product.unit,
      image: product.image,
      stock,
      labeledCount,
      missingCount: Math.max(0, stock - labeledCount),
    };
  });

  if (onlyPending) rows = rows.filter((row) => row.missingCount > 0);

  if (search) {
    const s = search.toLowerCase();
    rows = rows.filter(
      (row) =>
        row.productName.toLowerCase().includes(s) ||
        (row.productCode ?? "").toLowerCase().includes(s),
    );
  }

  if (category) rows = rows.filter((row) => row.category === category);

  return paginate(sortRows(rows, sortBy, sortOrder), page, limit);
};

export const fetchProductUnits = async (params = {}) => {
  await delay(400);

  const {
    page = 1,
    limit = 10,
    search = "",
    productId = "",
    status = "",
    printState = "",
    sortBy = "createdAt",
    sortOrder = "desc",
  } = params;

  let rows = [...allProductUnits];

  if (search) {
    const s = search.toLowerCase();
    rows = rows.filter(
      (u) =>
        u.unitCode.toLowerCase().includes(s) ||
        (u.productName ?? "").toLowerCase().includes(s) ||
        (u.productCode ?? "").toLowerCase().includes(s),
    );
  }

  if (productId) rows = rows.filter((u) => Number(u.productId) === Number(productId));
  if (status) rows = rows.filter((u) => u.status === status);
  if (printState === "printed") rows = rows.filter((u) => !!u.printedAt);
  if (printState === "unprinted") rows = rows.filter((u) => !u.printedAt);

  return paginate(sortRows(rows, sortBy, sortOrder), page, limit);
};

/**
 * ساخت N واحد تازه برای یک کالا. واحدها بلافاصله «در انبار» هستند؛
 * چاپ‌شدن یک محور جداگانه است (printedAt) چون کالای در انبار می‌تواند
 * هنوز برچسب نخورده باشد.
 */
export const generateProductUnits = async ({ productId, quantity, source }) => {
  await delay(500);

  const product = allProducts.find((p) => Number(p.id) === Number(productId));
  if (!product) throw new Error("کالا یافت نشد");

  const count = Number(quantity) || 0;
  if (count <= 0) throw new Error("تعداد باید بیشتر از صفر باشد");

  const now = new Date().toISOString();
  let sequence = nextUnitSequence();

  const created = Array.from({ length: count }, () => {
    const unit = {
      id: `u-${sequence}-${Math.random().toString(36).slice(2, 6)}`,
      unitCode: buildUnitCode(product.id, sequence),
      productId: product.id,
      productCode: product.code,
      productName: product.name,
      status: UNIT_STATUSES.IN_STOCK,
      printedAt: null,
      printCount: 0,
      source: source ?? { type: UNIT_SOURCE_TYPES.MANUAL, refId: null, refNumber: "" },
      saleId: null,
      createdAt: now,
      updatedAt: now,
    };
    sequence += 1;
    return unit;
  });

  allProductUnits.unshift(...created);
  return created;
};

export const markUnitsPrinted = async (unitIds = []) => {
  await delay(300);

  const now = new Date().toISOString();
  const ids = new Set(unitIds);

  allProductUnits.forEach((unit, index) => {
    if (!ids.has(unit.id)) return;
    allProductUnits[index] = {
      ...unit,
      printedAt: now,
      printCount: (unit.printCount || 0) + 1,
      updatedAt: now,
    };
  });

  return { success: true, count: ids.size };
};

/* -------------------------------------------------------------------- */
/* چرخه‌ی عمر واحد در جریان فروش                                          */
/*                                                                      */
/* فروش در این سیستم بر پایه‌ی «تعداد» است و کاربر واحدها را دستی        */
/* انتخاب نمی‌کند؛ پس تخصیص به‌صورت FIFO انجام می‌شود: قدیمی‌ترین         */
/* واحدهای در انبار اول می‌روند. این توابع sync هستند چون دقیقاً کنار    */
/* adjustProductsStock و از داخل همان mockهای فروش/ارسال صدا زده        */
/* می‌شوند.                                                             */
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
  items.forEach(({ productId, qty }) => {
    const needed = Number(qty) || 0;
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
      });
    });
  });
}

export function markUnitsShipped(saleId, items = []) {
  items.forEach(({ productId, qty }) => {
    const needed = Number(qty) || 0;
    if (needed <= 0) return;

    const candidates = oldestFirst(
      (unit) =>
        Number(unit.saleId) === Number(saleId) &&
        Number(unit.productId) === Number(productId) &&
        unit.status === UNIT_STATUSES.SOLD,
    ).slice(0, needed);

    candidates.forEach(({ unit, index }) => {
      allProductUnits[index] = touch(unit, { status: UNIT_STATUSES.SHIPPED });
    });
  });
}

/** لغو فروش: واحدهای تخصیص‌یافته دوباره به انبار برمی‌گردند. */
export function releaseUnitsForSale(saleId) {
  allProductUnits.forEach((unit, index) => {
    if (Number(unit.saleId) !== Number(saleId)) return;
    if (unit.status !== UNIT_STATUSES.SOLD && unit.status !== UNIT_STATUSES.SHIPPED) {
      return;
    }

    allProductUnits[index] = touch(unit, {
      status: UNIT_STATUSES.IN_STOCK,
      saleId: null,
    });
  });
}
