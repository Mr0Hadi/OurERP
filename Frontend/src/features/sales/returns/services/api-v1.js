import axiosInstance from "@/shared/services/api/axios";
import {
  idempotent,
  normalizeListResponse,
} from "@/shared/services/api/contract";
import { toApiClaim, fromApiReturn } from "./apiMapping";

/**
 * نسخه‌ی هماهنگ‌شده با بکندِ واقعی — کنترلر `api/SaleReturn`
 * (`Backend-Net/docs/api-guide.fa.md`، بخش ۱۲؛ بخش ۷ گزارشِ شکافِ
 * خرید/فروش). قرینه‌ی دقیقِ `purchases/returns/services/api-v1.js`؛
 * توضیحاتِ کامل همان‌جاست.
 *
 * ⚠️ بکندِ فعلی هدرِ Idempotency-Key را نمی‌خواند — این محافظت فعلاً
 * فقط سمتِ فرانت است.
 */

// ─── خواندن ─────────────────────────────────────────────────────────────────

export async function fetchSalesReturns(params = {}) {
  const { data } = await axiosInstance.get("/SaleReturn/GetSaleReturnList", {
    params: {
      page: params.page,
      take: params.limit,
      search: params.search || undefined,
      // برخلاف مرجوعی خرید، اینجا هم saleId هم customerId پشتیبانی می‌شود.
      customerId: params.customerIds?.[0] ?? undefined,
      status: params.status !== "" ? params.status : undefined,
      problem: params.problem !== "" ? params.problem : undefined,
      fromDate: params.fromDate || undefined,
      toDate: params.toDate || undefined,
      // scope/sortBy/sortOrder روی این لیست پشتیبانی نمی‌شوند.
    },
  });
  return normalizeListResponse(data, { itemsKey: "returnList" });
}

export async function fetchSalesReturnById(id) {
  const { data } = await axiosInstance.get("/SaleReturn/GetSaleReturnDetail", {
    params: { id },
  });
  return fromApiReturn(data);
}

/** فهرست کوتاهِ فروش‌های قابل‌مرجوع برای انتخابگر فرم — بکند `returnable` ندارد، فیلترِ نهایی سمتِ فرانت است. */
export async function fetchReturnableSales(search = "") {
  const { data } = await axiosInstance.get("/Sale/GetSaleList", {
    params: { invoiceNumber: search || undefined, take: 30 },
  });
  return normalizeListResponse(data, { itemsKey: "saleList" }).items;
}

/**
 * ⚠️ بکند برای فروش هیچ چیزِ معادلِ «سقفِ قابل‌ادعا برای هر قلم» ندارد
 * — نه چیزی مثل `GetPurchaseReceivingInfo`. سرور این را فقط لحظه‌ی
 * `POST CreateSaleReturn` چک می‌کند. فعلاً از خودِ `GetSaleDetail`
 * استفاده می‌کنیم که `items[].shippedQuantity`/`settledQuantity` دارد؛
 * سقفِ دقیقِ ادعا را فرم باید از خطای سرور بفهمد.
 */
export async function fetchSaleForReturn(saleId) {
  const { data } = await axiosInstance.get("/Sale/GetSaleDetail", {
    params: { id: saleId },
  });
  return data;
}

// ─── نوشتن ──────────────────────────────────────────────────────────────────

export async function createSalesReturn(payload, { idempotencyKey } = {}) {
  const { data } = await axiosInstance.post(
    "/SaleReturn/CreateSaleReturn",
    {
      saleId: payload.saleId,
      returnDate: payload.returnDate,
      description: payload.description || "",
      previousReturnId: payload.previousReturnId ?? null,
      claims: (payload.claims || []).map(toApiClaim),
    },
    idempotent(idempotencyKey),
  );
  return fromApiReturn(data);
}

export async function addClaimResolution(
  returnId,
  claimId,
  composition,
  { idempotencyKey } = {},
) {
  const { data } = await axiosInstance.post(
    "/SaleReturn/AddClaimResolution",
    { claimId, composition },
    idempotent(idempotencyKey),
  );
  return fromApiReturn(data);
}

/** بکند فقط شناسه‌ی *تصمیم* (`resolutionId`) می‌خواهد؛ `returnId`/`claimId` فقط برای رفرشِ کش فرانت لازم بودند. */
export async function removeClaimResolution(returnId, claimId, resolutionId) {
  const { data } = await axiosInstance.delete("/SaleReturn/RemoveClaimResolution", {
    params: { id: resolutionId },
  });
  return fromApiReturn(data);
}

/**
 * یک دور اجرای اثرهای کالایی — قرینه‌ی سمتِ خرید.
 *
 * ⚠️ اسمِ فیلدِ شناسه روی بدنه‌ی سمتِ فروش (`SaleReturnId` در برابرِ
 * `PurchaseReturnId` سمتِ خرید) در همین جلسه مستقیماً از کدِ بکند
 * تأیید نشد؛ قبل از قطعی‌کردن، با یک درخواستِ واقعی (یا خودِ تیم
 * بکند) چک شود.
 */
export async function executeGoodsRound(
  returnId,
  payload,
  { idempotencyKey } = {},
) {
  const { data } = await axiosInstance.post(
    "/SaleReturn/ExecuteGoodsRound",
    { saleReturnId: returnId, ...payload },
    idempotent(idempotencyKey),
  );
  return fromApiReturn(data);
}

// ─── چرخه‌ی عمر ─────────────────────────────────────────────────────────────

/** بکند «دلیل» را روی رد/لغو نمی‌گیرد — فقط `{id}`. */
export async function rejectSalesReturn(returnId) {
  const { data } = await axiosInstance.post("/SaleReturn/RejectSaleReturn", {
    id: returnId,
  });
  return fromApiReturn(data);
}

export async function cancelSalesReturn(returnId) {
  const { data } = await axiosInstance.post("/SaleReturn/CancelSaleReturn", {
    id: returnId,
  });
  return fromApiReturn(data);
}

export async function reopenSalesReturn(returnId) {
  const { data } = await axiosInstance.post("/SaleReturn/ReopenSaleReturn", {
    id: returnId,
  });
  return fromApiReturn(data);
}

export async function removeSalesReturn(returnId) {
  const { data } = await axiosInstance.delete("/SaleReturn/DeleteSaleReturn", {
    params: { id: returnId },
  });
  // پاسخِ حذف هم سند را برمی‌گرداند: لایه‌ی mutation برای پاک‌کردن کش و
  // بازگرداندن کاربر به لیست، به `id` و `saleId` نیاز دارد.
  return fromApiReturn(data) ?? { id: returnId };
}
