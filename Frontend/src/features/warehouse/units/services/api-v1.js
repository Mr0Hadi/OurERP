// src/features/warehouse/units/services/api-v1.js

import axiosInstance from "@/shared/services/api/axios";
import { normalizeListResponse } from "@/shared/services/api/contract";
import {
  parseBarcode,
  productCodeOf,
  toPayload,
} from "@/shared/services/barcode/productCode";
import { BarcodeReferenceKindEnum } from "@/shared/domain/enums/barcodeReferenceKind";

/**
 * لایه‌ی تماس با دانه‌های فیزیکیِ کالا.
 *
 * برخلافِ چیزی که نامِ صفحه («برچسب کالاها») القا می‌کند، بکند کنترلرِ
 * جدایی برای دانه‌ها ندارد: هر چه هست زیر `api/Product` است
 * (`GetProductUnitList` و `ScanBarcode` — بخش ۷ سند api-guide.fa.md) و
 * خودِ دانه‌ها هم *اثرِ جانبیِ* موجودی‌اند، نه چیزی که مستقیم ساخته یا
 * ویرایش شود:
 *
 * - ساخت: `UpdateProduct` با `stock` بزرگ‌تر → سرور خودش دانه می‌زند.
 * - مصرف: ثبتِ فروش → سرور خودش `SOLD` می‌کند.
 *
 * به همین دلیل این فایل فقط همین دو تماس را دارد؛ هر چیز دیگری که
 * صفحه لازم داشت (ساخت دستی، ثبتِ چاپ، اصلاحِ دستیِ وضعیت) از فرانت
 * حذف شد. جزئیات در
 * `Backend-Net/docs/product-unit-frontend-requirements.fa.md`.
 */

/**
 * `ProductUnitDto` سرور → همان شکلی که کامپوننت‌های این فیچر مصرف
 * می‌کنند.
 *
 * `productName`/`productCode` را سرور می‌دهد (هماهنگ‌شده با تیم بکند،
 * ۱۴۰۵/۰۶/۰۸). دو fallback عمداً نگه داشته شده‌اند و کدِ مرده نیستند:
 *
 * - `product` — پاسخِ `ScanBarcode` کالا را کنارِ دانه می‌آورد؛ آن نسخه
 *   تازه‌تر و کامل‌تر است، پس بر فیلدهای خودِ دانه اولویت دارد.
 * - `productCodeOf(barcode)` — کدِ کالا *داخلِ* بارکدِ دانه است (دو بخشِ
 *   اول)، پس اگر روزی این فیلد خالی برگردد ستون خالی نمی‌ماند. برای
 *   `productName` چنین چیزی ممکن نیست و `null` می‌ماند.
 */
export function normalizeProductUnit(dto, product = null) {
  if (!dto) return null;

  return {
    id: dto.id,
    productId: dto.productId,
    serialNumber: dto.serialNumber,

    // بارکدِ خوانا برای نمایش، payload برای رندرِ میله‌ها و مقایسه با سرور.
    barcode: dto.barcode ?? "",
    barcodePayload: dto.barcodePayload ?? toPayload(dto.barcode),

    productCode: product?.code ?? dto.productCode ?? productCodeOf(dto.barcode),
    productName: product?.name ?? dto.productName ?? null,

    status: dto.status,

    // «این دانه از کجا آمد» در بکند فقط با `PurchaseItemId` بیان می‌شود؛
    // نبودنش یعنی سرور خودش هنگام هماهنگیِ موجودی زده است.
    purchaseItemId: dto.purchaseItemId ?? null,
    // شناسه‌ی *خطِ* فروش است نه خودِ فروش — نامش عمداً مثل سرور مانده.
    saleItemId: dto.saleItemId ?? null,

    createdAt: dto.createdAt ?? null,
    soldAt: dto.soldAt ?? null,
  };
}

/**
 * `GET api/Product/GetProductUnitList`
 *
 * سرور فقط `productId`، `status` و بازه‌ی سریال را فیلتر می‌کند —
 * جست‌وجوی متنی و مرتب‌سازی را ندارد؛ اگر صفحه آن‌ها را بفرستد بی‌صدا
 * نادیده گرفته می‌شوند.
 */
export const fetchProductUnits = async (params = {}) => {
  const { data } = await axiosInstance.get("/Product/GetProductUnitList", {
    params: {
      page: params.page,
      take: params.limit,
      productId: params.productId || undefined,
      status: params.status || undefined,
      fromSerial: params.fromSerial || undefined,
      toSerial: params.toSerial || undefined,
    },
  });

  const list = normalizeListResponse(data, { itemsKey: "productUnitList" });

  return {
    ...list,
    items: list.items.map((dto) => normalizeProductUnit(dto)),
  };
};

/**
 * `GET api/Product/ScanBarcode?code=...`
 *
 * ورودی هرچه اسکنر بدهد: کدِ کالا یا بارکدِ دانه، با یا بدونِ
 * خط‌تیره‌های نمایشی. سرور برای کدِ نامعتبر ۴۰۴ می‌دهد، پس `UNKNOWN`
 * در پاسخِ *موفق* هرگز دیده نمی‌شود.
 *
 * تفسیرِ محلیِ کد قبل از شبکه انجام می‌شود تا ورودیِ بی‌ربط (مثلاً
 * بارکدِ تامین‌کننده روی کارتن) یک رفت‌وبرگشتِ بی‌فایده نسازد.
 */
export const resolveScannedCode = async (code) => {
  const reference = parseBarcode(code);

  if (reference.kind === BarcodeReferenceKindEnum.UNKNOWN) {
    return {
      kind: BarcodeReferenceKindEnum.UNKNOWN,
      normalizedPayload: reference.normalizedPayload,
      product: null,
      unit: null,
    };
  }

  const { data } = await axiosInstance.get("/Product/ScanBarcode", {
    params: { code },
  });

  const product = data?.product ?? null;

  return {
    kind: data?.kind ?? reference.kind,
    normalizedPayload: data?.normalizedPayload ?? reference.normalizedPayload,
    categoryName: data?.categoryName ?? null,
    product,
    unit: normalizeProductUnit(data?.unit, product),
  };
};

// ─── چاپِ برچسب — `api/Barcode` ─────────────────────────────────────────────

/**
 * `api/Barcode` پوششِ `ResponseDto` ندارد و مستقیماً فایل (SVG/PDF)
 * برمی‌گرداند — همان قراردادِ `shared/services/invoice/api-v1.js`:
 * `responseType: "blob"` و بازکردنِ پیامِ فارسیِ خطا از دلِ بلاب، چون
 * اینترسپتورِ axios با این responseType نمی‌تواند آن را خودش باز کند.
 *
 * صفحه‌ی «برچسب کالاها» فعلاً برچسب‌ها را کاملاً سمتِ مرورگر (Canvas)
 * می‌سازد و به این دو تابع نیازی ندارد — رندرِ محلی سریع‌تر است و آفلاین
 * هم کار می‌کند. این دو برای وقتی‌اند که یک مسیر «دانلود PDF رسمی»
 * (چیدمانِ دقیقِ برگه‌ی چاپِ سرور، نه پیش‌نمایشِ مرورگر) لازم شود.
 */

async function unwrapBlobError(error) {
  const body = error?.response?.data;
  if (!(body instanceof Blob)) throw error;

  try {
    const parsed = JSON.parse(await body.text());
    const message = parsed?.Message ?? parsed?.message ?? parsed?.title;
    if (message) error.message = message;
  } catch {
    // بدنه‌ی غیر JSON (مثلاً صفحه‌ی خطای پروکسی) — پیامِ خودِ axios می‌ماند.
  }

  throw error;
}

async function fetchFile(url, params) {
  try {
    const { data } = await axiosInstance.get(url, {
      params,
      responseType: "blob",
      timeout: 60000,
    });
    return data;
  } catch (error) {
    return unwrapBlobError(error);
  }
}

/**
 * `GET api/Barcode/GetBarcodeSvg` — رندرِ برداریِ یک کدِ از قبل شناخته‌شده
 * (کدِ کالا یا بارکدِ یک دانه، معمولاً از `ScanBarcode`/`GetProductUnitList`).
 * @returns Blob با `image/svg+xml`
 */
export const getBarcodeSvg = (code, options = {}) =>
  fetchFile("/Barcode/GetBarcodeSvg", {
    code,
    moduleWidthMm: options.moduleWidthMm,
    barHeightMm: options.barHeightMm,
    showHumanReadable: options.showHumanReadable,
  });

/**
 * `GET api/Barcode/GetProductLabelsPdf` — برگه‌ی چاپِ سرور، یک برچسب به
 * ازای هر دانه‌ی `IN_STOCK` (یا بازه‌ی سریالِ داده‌شده) از یک کالا.
 * @returns Blob با `application/pdf`
 */
export const getProductLabelsPdf = (productId, options = {}) =>
  fetchFile("/Barcode/GetProductLabelsPdf", {
    productId,
    status: options.status,
    fromSerial: options.fromSerial,
    toSerial: options.toSerial,
    mode: options.mode,
    columns: options.columns,
    rows: options.rows,
    labelWidthMm: options.labelWidthMm,
    labelHeightMm: options.labelHeightMm,
    showProductName: options.showProductName,
    showPrice: options.showPrice,
  });
