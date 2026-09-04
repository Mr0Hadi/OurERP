import axiosInstance from "@/shared/services/api/axios";
import {
  idempotent,
  normalizeListResponse,
} from "@/shared/services/api/contract";
import { toApiClaim, fromApiReturn } from "./apiMapping";

/**
 * نسخه‌ی هماهنگ‌شده با بکندِ واقعی — کنترلر `api/PurchaseReturn`
 * (`Backend-Net/docs/api-guide.fa.md`، بخش ۱۰؛ بخش ۷ گزارشِ شکافِ
 * خرید/فروش).
 *
 * خبر خوب: مدلِ داده‌ی این ماژول (Claim → Resolution → Effect) از قبل
 * دقیقاً با بکند یکی بود؛ فقط مسیرها REST فرضی (`/purchase-returns/...`)
 * بودند و باید به الگوی `api/{Controller}/{Action}` بکند عوض می‌شدند.
 * شکلِ بدنه‌ها دست‌نخورده ماند.
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
 *  ۳. عملیاتِ تجمعی (ثبت تصمیم، دور کالا) کلید ایدمپوتنسی می‌گیرد —
 *     ⚠️ ولی بکندِ فعلی این هدر را اصلاً نمی‌خواند (گزارشِ شکاف، بخش
 *     ۶)، پس این محافظت فعلاً فقط سمتِ فرانت است، نه واقعی.
 *
 * پوششِ `ResponseDto` در interceptor باز می‌شود، پس اینجا `data` همان
 * محتوای واقعی است.
 */

// ─── خواندن ─────────────────────────────────────────────────────────────────

export async function fetchPurchaseReturns(params = {}) {
  const { data } = await axiosInstance.get("/PurchaseReturn/GetPurchaseReturnList", {
    params: {
      page: params.page,
      take: params.limit,
      search: params.search || undefined,
      // بکند فقط یک supplierId تکی می‌گیرد، نه آرایه.
      supplierId: params.supplierId || undefined,
      status: params.status !== "" ? params.status : undefined,
      // مشکل روی *غالب‌ترین ادعا*ی سند فیلتر می‌شود، نه هر ادعا جدا.
      problem: params.problem !== "" ? params.problem : undefined,
      fromDate: params.fromDate || undefined,
      toDate: params.toDate || undefined,
      // scope/sortBy/sortOrder روی این لیست پشتیبانی نمی‌شوند.
    },
  });
  return normalizeListResponse(data, { itemsKey: "returnList" });
}

export async function fetchPurchaseReturnById(id) {
  const { data } = await axiosInstance.get("/PurchaseReturn/GetPurchaseReturnDetail", {
    params: { id },
  });
  return fromApiReturn(data);
}

/**
 * فهرست کوتاهِ خریدهای قابل‌مرجوع برای انتخابگر فرم.
 *
 * ⚠️ بکند پارامترِ `returnable` ندارد — این فقط لیستِ عادیِ خریدهاست؛
 * فیلترِ «واقعاً چیزی رسیده که بشود مرجوعش کرد» باید در فرانت (روی
 * وضعیت/دریافتی‌های هر خرید) انجام شود.
 */
export async function fetchReturnablePurchases(search = "") {
  const { data } = await axiosInstance.get("/Purchase/GetPurchaseList", {
    params: { invoiceNumber: search || undefined, take: 30 },
  });
  return normalizeListResponse(data, { itemsKey: "purchaseList" }).items;
}

/**
 * اقلام یک خرید به‌همراه چقدر تا الان دریافت شده.
 *
 * ⚠️ برخلاف چیزی که این تابع قبلاً فرض می‌کرد، بکند سقفِ *قابل‌ادعا*
 * (دریافتی منهای آنچه در مرجوعی‌های فعالِ دیگر ادعا شده) را برنمی‌گرداند
 * — فقط `orderedQuantity`/`receivedQuantity`/`stillOwedQuantity` می‌دهد
 * (که برای فرمِ *دریافت*، نه فرمِ *مرجوعی*، ساخته شده). سرور سقفِ
 * ادعا را فقط لحظه‌ی `POST CreatePurchaseReturn` چک می‌کند؛
 * `excludeReturnId` اینجا اثری ندارد چون endpointِ واقعی چنین
 * پارامتری نمی‌شناسد. تا وقتی بکند این را اضافه نکند، فرم باید خطای
 * سرور را هم مدیریت کند.
 */
export async function fetchPurchaseForReturn(purchaseId) {
  const { data } = await axiosInstance.get("/PurchaseReturn/GetPurchaseReceivingInfo", {
    params: { purchaseId },
  });
  return data;
}

// ─── نوشتن ──────────────────────────────────────────────────────────────────

export async function createPurchaseReturn(payload, { idempotencyKey } = {}) {
  const { data } = await axiosInstance.post(
    "/PurchaseReturn/CreatePurchaseReturn",
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
    "/PurchaseReturn/AddClaimResolution",
    { claimId, composition },
    idempotent(idempotencyKey),
  );
  return fromApiReturn(data);
}

/** بکند فقط شناسه‌ی *تصمیم* (`resolutionId`) می‌خواهد؛ `returnId`/`claimId` فقط برای رفرشِ کش فرانت لازم بودند. */
export async function removeClaimResolution(returnId, claimId, resolutionId) {
  const { data } = await axiosInstance.delete("/PurchaseReturn/RemoveClaimResolution", {
    params: { id: resolutionId },
  });
  return fromApiReturn(data);
}

/**
 * یک دور اجرای اثرهای کالایی — وقتی انبار واقعاً کالا را جابه‌جا کرد.
 *
 * بدنه:
 *
 *   {
 *     purchaseReturnId, rounds: [{ effectId, quantity, observations: [{ problem, quantity, note }] }],
 *     date, partyName, partyNationalId, vehiclePlate, note
 *   }
 *
 * `observations` مشاهده‌ی مستقلِ انباردار است و فقط برای اثرِ ورودی
 * معنا دارد. مقدارِ سالم عمداً فرستاده نمی‌شود: سرور آن را از
 * `quantity` منهای مجموع مشاهده‌ها حساب می‌کند تا دو عددِ ناسازگار
 * وجود نداشته باشد.
 *
 * صفحات انبار این را مستقیم صدا نمی‌زنند؛ آن‌ها endpoint خودشان را
 * دارند (`ReceivePurchase`) و سرور از همان‌جا اثرها را نمی‌بندد —
 * اجرای اثرها همیشه از همین مسیر انجام می‌شود.
 */
export async function executeGoodsRound(
  returnId,
  payload,
  { idempotencyKey } = {},
) {
  const { data } = await axiosInstance.post(
    "/PurchaseReturn/ExecuteGoodsRound",
    { purchaseReturnId: returnId, ...payload },
    idempotent(idempotencyKey),
  );
  return fromApiReturn(data);
}

// ─── چرخه‌ی عمر ─────────────────────────────────────────────────────────────

/** بکند «دلیل» را روی رد/لغو نمی‌گیرد — فقط `{id}`. `reason` فعلاً نگه داشته می‌شود ولی فرستاده نمی‌شود. */
export async function rejectPurchaseReturn(returnId) {
  const { data } = await axiosInstance.post("/PurchaseReturn/RejectPurchaseReturn", {
    id: returnId,
  });
  return fromApiReturn(data);
}

export async function cancelPurchaseReturn(returnId) {
  const { data } = await axiosInstance.post("/PurchaseReturn/CancelPurchaseReturn", {
    id: returnId,
  });
  return fromApiReturn(data);
}

export async function reopenPurchaseReturn(returnId) {
  const { data } = await axiosInstance.post("/PurchaseReturn/ReopenPurchaseReturn", {
    id: returnId,
  });
  return fromApiReturn(data);
}

export async function removePurchaseReturn(returnId) {
  const { data } = await axiosInstance.delete("/PurchaseReturn/DeletePurchaseReturn", {
    params: { id: returnId },
  });
  // پاسخِ حذف هم سند را برمی‌گرداند: لایه‌ی mutation برای پاک‌کردن کش و
  // بازگرداندن کاربر به لیست، به `id` و `purchaseId` نیاز دارد.
  return fromApiReturn(data) ?? { id: returnId };
}
