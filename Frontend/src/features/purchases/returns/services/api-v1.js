import axiosInstance from "@/shared/services/api/axios";
import {
  idempotent,
  listParams,
  normalizeListResponse,
} from "@/shared/services/api/contract";
import { toApiClaim, fromApiReturn } from "./apiMapping";

/**
 * نسخه‌ی واقعیِ APIِ مرجوعی خرید.
 *
 * سطحش دقیقاً همان چیزی است که `queries.js` و `mutations.js` امروز از
 * `api-mockData` می‌گیرند — نه یک تابع بیشتر، نه یک آرگومان متفاوت.
 * مهاجرت یعنی عوض‌کردن `./api-mockData` به `./api-v1` در آن دو فایل و
 * هیچ چیز دیگر.
 *
 * سه قاعده‌ی این لایه:
 *
 *  ۱. «موتور اثر» اینجا معادلی ندارد و نباید داشته باشد. اینکه یک
 *     تصمیم به چه اثرهایی باز می‌شود، چه بر موجودی و مبلغ خرید
 *     می‌گذارد و وضعیت مرجوعی چه می‌شود، کارِ سرور است. فرانت ترکیب را
 *     می‌فرستد و سندِ به‌روزشده را می‌گیرد.
 *
 *  ۲. هر عملیاتِ نوشتن، *سندِ کاملِ به‌روزشده‌ی مرجوعی* را برمی‌گرداند.
 *     لایه‌ی mutation روی همین بنا شده (`setQueryData`)؛ اگر سرور فقط
 *     شناسه برگرداند، هر عملیات یک refetch اضافه می‌خورد و UI پرش
 *     می‌کند.
 *
 *  ۳. عملیاتِ تجمعی (ثبت تصمیم، دور کالا) کلید ایدمپوتنسی می‌گیرد تا
 *     retry شبکه یا دوبار کلیک، دوبار اعمال نشود.
 *
 * پوششِ `ResponseDto` در interceptor باز می‌شود، پس اینجا `data` همان
 * محتوای واقعی است.
 */

// ─── خواندن ─────────────────────────────────────────────────────────────────

export async function fetchPurchaseReturns(params = {}) {
  const { data } = await axiosInstance.get("/purchase-returns", {
    params: {
      ...listParams(params),
      supplierIds: params.supplierIds?.length ? params.supplierIds : undefined,
      status: params.status || undefined,
      // مشکل و دامنه روی *ادعاها* فیلتر می‌شوند نه روی سند: یک مرجوعی
      // می‌تواند چند ادعا با مشکل‌های مختلف داشته باشد.
      problem: params.problem || undefined,
      scope: params.scope || undefined,
    },
  });
  return normalizeListResponse(data, { itemsKey: "returnList" });
}

export async function fetchPurchaseReturnById(id) {
  const { data } = await axiosInstance.get(`/purchase-returns/${id}`);
  return fromApiReturn(data);
}

/** فهرست کوتاهِ خریدهای قابل‌مرجوع برای انتخابگر فرم. */
export async function fetchReturnablePurchases(search = "") {
  const { data } = await axiosInstance.get("/purchases", {
    params: { search: search || undefined, returnable: true, limit: 30 },
  });
  return normalizeListResponse(data, { itemsKey: "purchaseList" }).items;
}

/**
 * اقلام یک خرید به‌همراه سقف ادعا و مقدارِ ادعاشده در مرجوعی‌های دیگر.
 *
 * `excludeReturnId` برای صفحه‌ی جزئیات است تا ادعاهای خودِ همان مرجوعی
 * دوبار شمرده نشوند.
 *
 * هر قلم باید `orderLineId` (همان `PurchaseItem.Id`) داشته باشد؛ فرم با
 * همین به خط فاکتور ارجاع می‌دهد، نه با `productId` — یک کالا می‌تواند
 * در دو خط سفارش با قیمت متفاوت باشد.
 */
export async function fetchPurchaseForReturn(purchaseId, excludeReturnId = null) {
  const { data } = await axiosInstance.get(`/purchases/${purchaseId}/for-return`, {
    params: { excludeReturnId: excludeReturnId ?? undefined },
  });
  return data;
}

// ─── نوشتن ──────────────────────────────────────────────────────────────────

export async function createPurchaseReturn(payload, { idempotencyKey } = {}) {
  const { data } = await axiosInstance.post(
    "/purchase-returns",
    {
      purchaseId: payload.purchaseId,
      returnDate: payload.returnDate,
      description: payload.description || "",
      previousReturnId: payload.previousReturnId ?? null,
      claims: (payload.claims || []).map(toApiClaim),
    },
    idempotent(idempotencyKey),
  );
  return fromApiReturn(data);
}

/**
 * ثبت یک تصمیم روی یک ادعا.
 *
 * بدنه همان «ترکیب»ی است که فرم می‌سازد — سه محورِ مستقلِ
 * `goodsIn`/`goodsOut`/`money`. باز کردنش به اثرهای پایه کارِ سرور
 * است؛ اگر فرانت اثرها را بسازد و بفرستد، منطق در دو جا زندگی می‌کند
 * و روزی از هم جدا می‌افتد.
 */
export async function addClaimResolution(
  returnId,
  claimId,
  composition,
  { idempotencyKey } = {},
) {
  const { data } = await axiosInstance.post(
    `/purchase-returns/${returnId}/claims/${claimId}/resolutions`,
    composition,
    idempotent(idempotencyKey),
  );
  return fromApiReturn(data);
}

export async function removeClaimResolution(returnId, claimId, resolutionId) {
  const { data } = await axiosInstance.delete(
    `/purchase-returns/${returnId}/claims/${claimId}/resolutions/${resolutionId}`,
  );
  return fromApiReturn(data);
}

/**
 * یک دور اجرای اثرهای کالایی — وقتی انبار واقعاً کالا را جابه‌جا کرد.
 *
 * بدنه:
 *
 *   {
 *     rounds: [{ effectId, qty, observations: [{ problem, qty, note }] }],
 *     date, partyName, partyNationalId, vehiclePlate, note
 *   }
 *
 * `observations` مشاهده‌ی مستقلِ انباردار است و فقط برای اثرِ ورودی
 * معنا دارد. مقدارِ سالم عمداً فرستاده نمی‌شود: سرور آن را از
 * `qty` منهای مجموع مشاهده‌ها حساب می‌کند تا دو عددِ ناسازگار وجود
 * نداشته باشد.
 *
 * صفحات انبار این را مستقیم صدا نمی‌زنند؛ آن‌ها endpoint خودشان را
 * دارند و سرور از همان‌جا اثرها را می‌بندد. این مسیر برای وقتی است که
 * خودِ صفحه‌ی مرجوعی دور را ثبت کند.
 */
export async function executeGoodsRound(
  returnId,
  payload,
  { idempotencyKey } = {},
) {
  const { data } = await axiosInstance.post(
    `/purchase-returns/${returnId}/goods-rounds`,
    payload,
    idempotent(idempotencyKey),
  );
  return fromApiReturn(data);
}

// ─── چرخه‌ی عمر ─────────────────────────────────────────────────────────────

export async function rejectPurchaseReturn(returnId, reason) {
  const { data } = await axiosInstance.post(
    `/purchase-returns/${returnId}/reject`,
    { reason },
  );
  return fromApiReturn(data);
}

export async function cancelPurchaseReturn(returnId, reason) {
  const { data } = await axiosInstance.post(
    `/purchase-returns/${returnId}/cancel`,
    { reason },
  );
  return fromApiReturn(data);
}

export async function reopenPurchaseReturn(returnId) {
  const { data } = await axiosInstance.post(`/purchase-returns/${returnId}/reopen`);
  return fromApiReturn(data);
}

export async function removePurchaseReturn(returnId) {
  const { data } = await axiosInstance.delete(`/purchase-returns/${returnId}`);
  // پاسخِ حذف هم سند را برمی‌گرداند: لایه‌ی mutation برای پاک‌کردن کش و
  // بازگرداندن کاربر به لیست، به `id` و `purchaseId` نیاز دارد.
  return fromApiReturn(data) ?? { id: returnId };
}
