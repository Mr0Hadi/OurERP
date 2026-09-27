import axiosInstance from "@/shared/services/api/axios";
import { idempotent, listQuery, normalizeListResponse } from "@/shared/services/api/contract";
import {
  parseBarcode,
  productCodeOf,
  toPayload,
} from "@/shared/domain/barcode/productCode";
import { BarcodeReferenceKindEnum } from "@/shared/domain/enums/barcodeReferenceKind";
import { UNIT_SORT_COLUMNS } from "../domain/unitVocabulary";

/**
 * لایه‌ی تماس با دانه‌های فیزیکیِ کالا — همه زیرِ `api/Product`.
 *
 * دانه‌ها اثرِ جانبیِ موجودی‌اند: با دریافتِ خرید یا افزایشِ موجودی ساخته
 * و با فروش/مرجوعی جابه‌جا می‌شوند. این صفحه دانه نمی‌سازد؛ فقط می‌بیند،
 * برچسب می‌زند و سه کارِ دستیِ انبار را انجام می‌دهد (قرنطینه، آزادسازی،
 * اسقاط).
 *
 * قرارداد (فیلترهای تازه، خلاصه، ثبتِ چاپ، کارهای دستی) در
 * `Backend-Net/docs/frontend-requests.fa.md` (بخشِ ۴) است.
 */

/**
 * `ProductUnitDto`ِ سرور با همان نام‌ها، به‌علاوه‌ی چند فیلدِ مشتق:
 *
 *  - `barcodePayload`: payloadِ رندرِ میله‌ها، اگر سرور نفرستاده باشد از بارکدِ خوانا.
 *  - `productCode`/`productName`/`requiresUnitTracking`: `product` (پاسخِ `ScanBarcode`)
 *    تازه‌تر از فیلدهای خودِ دانه است و اولویت دارد؛ کدِ کالا در نبودِ هر دو
 *    از دو بخشِ اولِ بارکدِ دانه خوانده می‌شود.
 */
export function normalizeProductUnit(dto, product = null) {
  if (!dto) return null;
  return {
    ...dto,
    barcode: dto.barcode ?? "",
    barcodePayload: dto.barcodePayload ?? toPayload(dto.barcode),
    productCode: product?.code ?? dto.productCode ?? productCodeOf(dto.barcode),
    productName: product?.name ?? dto.productName ?? null,
    requiresUnitTracking: Boolean(product?.requiresUnitTracking ?? dto.requiresUnitTracking),
    printCount: Number(dto.printCount) || 0,
  };
}

/** `GET api/Product/GetProductUnitList` — یک صفحه. */
export async function fetchProductUnits({ filters, page = 1, take = 20, sorting } = {}) {
  const { data } = await axiosInstance.get("/Product/GetProductUnitList", {
    params: listQuery({
      filters: { ...filters, search: filters?.search?.trim() },
      pagination: { pageIndex: page - 1, pageSize: take },
      sorting,
      sortColumns: UNIT_SORT_COLUMNS,
    }),
  });

  const list = normalizeListResponse(data, { itemsKey: "productUnitList" });
  return { ...list, items: list.items.map((dto) => normalizeProductUnit(dto)) };
}

/** بزرگ‌ترین صفحه‌ای که یک‌جا خوانده می‌شود (چاپ و خروجیِ همه‌ی نتایج، شمارش). */
const BULK_PAGE_SIZE = 200;

/**
 * همه‌ی دانه‌های یک فیلتر، صفحه به صفحه تا سقفِ `limit`.
 * `truncated` یعنی نتایج بیشتر از سقف بود و بقیه خوانده نشد.
 */
export async function fetchAllProductUnits(filters, { limit = 2000, sorting } = {}) {
  const items = [];
  let page = 1;
  let total = 0;

  for (;;) {
    const result = await fetchProductUnits({ filters, page, take: BULK_PAGE_SIZE, sorting });
    total = result.total ?? total;
    items.push(...result.items);
    if (items.length >= limit || page >= result.totalPages || result.items.length === 0) break;
    page += 1;
  }

  return {
    items: items.slice(0, limit),
    total,
    truncated: total > limit,
  };
}

/**
 * `GET api/Product/GetProductUnitSummary` — شمارشِ دانه‌ها به تفکیکِ وضعیت،
 * علتِ قرنطینه و برچسب (بند ۳). با `productId` برای یک کالا.
 */
export async function fetchProductUnitSummary({ productId } = {}) {
  const { data } = await axiosInstance.get("/Product/GetProductUnitSummary", {
    params: { productId: productId || undefined },
  });

  const toMap = (rows, key) =>
    Object.fromEntries((rows ?? []).map((row) => [row[key], row]));

  return {
    byStatus: toMap(data?.byStatus, "status"),
    quarantineByReason: toMap(data?.quarantineByReason, "custodyReason"),
    quarantineValue: Number(data?.quarantineValue) || 0,
    unprintedCount: Number(data?.unprintedCount) || 0,
  };
}

/** `GET api/Product/GetProductUnitHistory` — سفرِ یک دانه، قدیمی‌ترین اول. */
export async function fetchProductUnitHistory({ productUnitId, barcode } = {}) {
  const { data } = await axiosInstance.get("/Product/GetProductUnitHistory", {
    params: {
      productUnitId: productUnitId || undefined,
      barcode: barcode || undefined,
    },
  });
  return {
    unit: normalizeProductUnit(data?.unit),
    movements: data?.movements ?? [],
  };
}

/**
 * `GET api/Product/ScanBarcode?code=...` — کدِ کالا یا بارکدِ دانه.
 *
 * تفسیرِ محلی قبل از شبکه انجام می‌شود تا ورودیِ بی‌ربط (مثلاً بارکدِ
 * تامین‌کننده روی کارتن) یک رفت‌وبرگشتِ بی‌فایده نسازد.
 */
export async function resolveScannedCode(code) {
  const reference = parseBarcode(code);

  if (reference.kind === BarcodeReferenceKindEnum.UNKNOWN) {
    return { kind: BarcodeReferenceKindEnum.UNKNOWN, code, product: null, unit: null };
  }

  const { data } = await axiosInstance.get("/Product/ScanBarcode", { params: { code } });
  const product = data?.product ?? null;

  return {
    kind: data?.kind ?? reference.kind,
    code,
    product,
    unit: normalizeProductUnit(data?.unit, product),
  };
}

/**
 * `POST api/Product/MarkProductUnitsPrinted` (بند ۱) — بعد از اینکه
 * انباردار تأیید کرد برچسب‌ها واقعاً چاپ شدند.
 */
export async function markProductUnitsPrinted(productUnitIds) {
  const { data } = await axiosInstance.post("/Product/MarkProductUnitsPrinted", {
    productUnitIds,
  });
  return data;
}

/**
 * `POST api/Product/ApplyProductUnitAction` (بند ۴) — قرنطینه، آزادسازی
 * یا اسقاطِ دستیِ چند دانه با یک علت. موجودی و بهای تمام‌شده را سرور جابه‌جا
 * می‌کند؛ ایدمپوتنت است چون موجودی را عوض می‌کند.
 */
export async function applyProductUnitAction(payload, { idempotencyKey } = {}) {
  const { data } = await axiosInstance.post(
    "/Product/ApplyProductUnitAction",
    {
      action: payload.action,
      productUnitIds: payload.productUnitIds,
      reason: payload.reason,
      note: payload.note?.trim() || undefined,
      occurredAt: payload.occurredAt || undefined,
    },
    idempotent(idempotencyKey),
  );
  return data;
}
