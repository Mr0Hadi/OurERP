import axiosInstance from "@/shared/services/api/axios";
import {
  idempotent,
  normalizeListResponse,
} from "@/shared/services/api/contract";
import { toApiClaim, fromApiPurchaseReturn } from "@/shared/domain/returns/claimsApi";
import { toApiComposition } from "@/shared/domain/returns/resolutions";
import { PurchaseStatusEnum } from "@/shared/domain/enums/purchaseStatus";

/** `PurchaseReturnListSortEnum`ِ بکند، بر اساسِ شناسه‌ی ستونِ جدول. */
export const PURCHASE_RETURN_SORT_COLUMNS = {
  returnNumber: 1,
  returnDate: 2,
  purchaseInvoiceNumber: 3,
  supplierName: 4,
  status: 5,
  totalQuantity: 6,
  totalAmount: 7,
};

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
 *  ۳. عملیاتِ تجمعی (ثبت تصمیم، دور کالا) کلید ایدمپوتنسی می‌گیرد.
 *     سرور پاسخِ موفقِ همان کلید را دوباره پخش می‌کند، و وقتی درخواستِ
 *     اول هنوز در جریان است ۴۰۹ می‌دهد (که mutation دوباره می‌فرستد).
 *
 * پوششِ `ResponseDto` در interceptor باز می‌شود، پس اینجا `data` همان
 * محتوای واقعی است.
 */

// ─── خواندن ─────────────────────────────────────────────────────────────────

/**
 * `GET GetPurchaseReturnList` — پارامترها با همان نام‌های `GetPurchaseReturnListQuery`: از `listQuery`
 * برای لیست، یا `{ purchaseId, take }` برای «مرجوعی‌های دیگرِ همین سند».
 */
export async function fetchPurchaseReturns(params) {
  const { data } = await axiosInstance.get("/PurchaseReturn/GetPurchaseReturnList", { params });
  return normalizeListResponse(data, { itemsKey: "returnList" });
}

export async function fetchPurchaseReturnById(id) {
  const { data } = await axiosInstance.get("/PurchaseReturn/GetPurchaseReturnDetail", {
    params: { id },
  });
  return fromApiPurchaseReturn(data);
}

/**
 * وضعیت‌هایی که هیچ کالایی در آن‌ها نرسیده (یا خرید لغو شده) و بکند
 * روی آن‌ها مرجوعی نمی‌پذیرد یا چیزی برای ادعا ندارد.
 */
const NON_RETURNABLE_STATUSES = new Set([
  PurchaseStatusEnum.PROFORMA,
  PurchaseStatusEnum.PENDING,
  PurchaseStatusEnum.CANCELLED,
]);

/**
 * فهرست کوتاهِ خریدهای قابل‌مرجوع برای انتخابگر فرم.
 *
 * بکند پارامترِ `returnable` ندارد و `GetPurchaseList` فقط روی
 * `invoiceNumber` جست‌وجو می‌کند؛ پس لیستِ عادی گرفته و خریدهایی که
 * هنوز چیزی از آن‌ها نرسیده یا لغو شده‌اند همین‌جا کنار گذاشته می‌شوند.
 */
export async function fetchReturnablePurchases(search = "") {
  const { data } = await axiosInstance.get("/Purchase/GetPurchaseList", {
    params: { invoiceNumber: search || undefined, take: 30 },
  });
  return normalizeListResponse(data, { itemsKey: "purchaseList" }).items.filter(
    (purchase) => !NON_RETURNABLE_STATUSES.has(Number(purchase.status)),
  );
}

/**
 * اقلام یک خرید برای فرمِ مرجوعی — `PurchaseReceivingInfoDto`.
 *
 * سقف‌ها با `claimableQuantityOf` / `freeExcessQuantityOf` /
 * `freeUnlistedQuantityOf` در `purchaseReturnVocabulary` خوانده می‌شوند —
 * فیلدهای دقیقشان هنوز درخواستی از بکند است و تا آن وقت عددِ
 * نزدیکِ موجود جایشان می‌نشیند.
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
  return fromApiPurchaseReturn(data);
}

/**
 * ثبت یک تصمیم روی یک ادعا.
 *
 * `composition` همان چهار اسلاتِ ساختاریِ بک‌اند است —
 * `goodsIn`/`goodsOut`/`moneyIn`/`moneyOut` (`EffectCompositionDto`،
 * از ۲۰۲۶-۰۹-۰۷). شکلِ فرم یک لایه با آن فرق دارد و `toApiComposition`
 * همان‌جا کنارِ `expandComposition` این فاصله را پر می‌کند: `enabled`
 * فیلدی است که فقط فرم دارد، اسلاتِ کالا در فرم شیء است و در دستور
 * آرایه، و پیش‌فرضِ «همان کالای ادعا» باید قبل از ارسال باز شود چون
 * بکند روی آرایه‌ی خالی هیچ اثری نمی‌سازد.
 *
 * باز کردنِ ترکیب به اثرهای پایه همچنان کارِ سرور است؛ فرانت فقط شکل را
 * درست می‌کند، نه معنا را.
 */
export async function addClaimResolution(
  returnId,
  claim,
  composition,
  { idempotencyKey } = {},
) {
  const { data } = await axiosInstance.post(
    "/PurchaseReturn/AddClaimResolution",
    {
      claimId: claim.id,
      composition: toApiComposition(composition, claim),
    },
    idempotent(idempotencyKey),
  );
  return fromApiPurchaseReturn(data);
}

/** بکند فقط شناسه‌ی *تصمیم* (`resolutionId`) می‌خواهد؛ `returnId`/`claimId` فقط برای رفرشِ کش فرانت لازم بودند. */
export async function removeClaimResolution(returnId, claimId, resolutionId) {
  const { data } = await axiosInstance.delete("/PurchaseReturn/RemoveClaimResolution", {
    params: { id: resolutionId },
  });
  return fromApiPurchaseReturn(data);
}

/**
 * یک دور اجرای اثرهای کالایی — وقتی انبار واقعاً کالا را جابه‌جا کرد.
 *
 * بدنه:
 *
 *   {
 *     purchaseReturnId,
 *     rounds: [{ effectId, quantity, source?, productUnitBarcodes?,
 *                observations: [{ problem, quantity, note }] }],
 *     date, partyName, partyPhoneNumber, vehiclePlate, note
 *   }
 *
 * `source` (`ProductUnitStatusEnum`) روی عودت الزامی است — از موجودی
 * (IN_STOCK) یا از قرنطینه (QUARANTINED). `observations` فقط روی اثرِ
 * ورودی معنا دارد و مقدارِ سالم را سرور از `quantity` منهای مشاهده‌ها
 * حساب می‌کند.
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
  return fromApiPurchaseReturn(data);
}

/**
 * ثبتِ اینکه یک اثر مالیِ معلق (وعده‌ی پرداخت) واقعاً پرداخت شد —
 * همتای مالیِ `executeGoodsRound`. `paidAt` نفرستادن یعنی «همین حالا».
 */
export async function executeMoneyEffect(
  { effectId, paidAt, reference },
  { idempotencyKey } = {},
) {
  const { data } = await axiosInstance.post(
    "/PurchaseReturn/ExecuteMoneyEffect",
    { effectId, paidAt: paidAt || undefined, reference: reference || undefined },
    idempotent(idempotencyKey),
  );
  return fromApiPurchaseReturn(data);
}

// ─── چرخه‌ی عمر ─────────────────────────────────────────────────────────────

/**
 * `reason` اختیاری است (حداکثر ۵۰۰ نویسه) و روی سند به‌صورت
 * `statusReason` برمی‌گردد. رشته‌ی خالی یعنی «بی‌دلیل»؛ بازگشایی آن را
 * پاک می‌کند.
 */
export async function rejectPurchaseReturn(returnId, reason) {
  const { data } = await axiosInstance.post("/PurchaseReturn/RejectPurchaseReturn", {
    id: returnId,
    reason: reason?.trim() || undefined,
  });
  return fromApiPurchaseReturn(data);
}

export async function cancelPurchaseReturn(returnId, reason) {
  const { data } = await axiosInstance.post("/PurchaseReturn/CancelPurchaseReturn", {
    id: returnId,
    reason: reason?.trim() || undefined,
  });
  return fromApiPurchaseReturn(data);
}

export async function reopenPurchaseReturn(returnId) {
  const { data } = await axiosInstance.post("/PurchaseReturn/ReopenPurchaseReturn", {
    id: returnId,
  });
  return fromApiPurchaseReturn(data);
}

export async function removePurchaseReturn(returnId) {
  const { data } = await axiosInstance.delete("/PurchaseReturn/DeletePurchaseReturn", {
    params: { id: returnId },
  });
  // پاسخِ حذف هم سند را برمی‌گرداند: لایه‌ی mutation برای پاک‌کردن کش و
  // بازگرداندن کاربر به لیست، به `id` و `purchaseId` نیاز دارد.
  return fromApiPurchaseReturn(data) ?? { id: returnId };
}
