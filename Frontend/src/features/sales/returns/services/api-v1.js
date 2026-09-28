import axiosInstance from "@/shared/services/api/axios";
import {
  idempotent,
  normalizeListResponse,
  toApiAttachments,
} from "@/shared/services/api/contract";
import { toApiClaim, fromApiSaleReturn } from "@/shared/domain/returns/claimsApi";
import { toApiComposition } from "@/shared/domain/returns/resolutions";
import { RETURNABLE_SALE_STATUSES } from "@/features/sales/orders/domain/saleRules";

/** `SaleReturnListSortEnum`ِ بکند، بر اساسِ شناسه‌ی ستونِ جدول. */
export const SALE_RETURN_SORT_COLUMNS = {
  returnNumber: 1,
  returnDate: 2,
  saleInvoiceNumber: 3,
  customerName: 4,
  status: 5,
  totalQuantity: 6,
  totalAmount: 7,
};

/**
 * نسخه‌ی هماهنگ‌شده با بکندِ واقعی — کنترلر `api/SaleReturn`
 * (`Backend-Net/docs/api-guide.fa.md`، بخش ۱۲؛ بخش ۷ گزارشِ شکافِ
 * خرید/فروش). قرینه‌ی دقیقِ `purchases/returns/services/api-v1.js`؛
 * توضیحاتِ کامل همان‌جاست.
 */

// ─── خواندن ─────────────────────────────────────────────────────────────────

/**
 * `GET GetSaleReturnList` — پارامترها با همان نام‌های `GetSaleReturnListQuery`: از `listQuery`
 * برای لیست، یا `{ saleId, take }` برای «مرجوعی‌های دیگرِ همین سند».
 */
export async function fetchSalesReturns(params) {
  const { data } = await axiosInstance.get("/SaleReturn/GetSaleReturnList", { params });
  return normalizeListResponse(data, { itemsKey: "returnList" });
}

export async function fetchSalesReturnById(id) {
  const { data } = await axiosInstance.get("/SaleReturn/GetSaleReturnDetail", {
    params: { id },
  });
  return fromApiSaleReturn(data);
}

/**
 * فهرست کوتاهِ فروش‌های قابل‌مرجوع برای انتخابگر فرم — فقط وضعیت‌هایی که
 * `CreateSaleReturn` می‌پذیرد (چیزی ارسال شده باشد).
 */
export async function fetchReturnableSales(search = "") {
  const { data } = await axiosInstance.get("/Sale/GetSaleList", {
    params: {
      invoiceNumber: search || undefined,
      statuses: RETURNABLE_SALE_STATUSES,
      take: 30,
    },
  });
  return normalizeListResponse(data, { itemsKey: "saleList" }).items;
}

/**
 * فروش برای فرمِ مرجوعی — `GetSaleDetail`. سقفِ هر قلم
 * `items[].claimableQuantity` (و برای مازاد `claimableExcessQuantity`) است،
 * همان عددی که `CreateSaleReturn` چک می‌کند.
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
  return fromApiSaleReturn(data);
}

/**
 * ثبت یک تصمیم روی یک ادعا — قرینه‌ی سمتِ خرید.
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
    "/SaleReturn/AddClaimResolution",
    { claimId: claim.id, composition: toApiComposition(composition, claim) },
    idempotent(idempotencyKey),
  );
  return fromApiSaleReturn(data);
}

/** بکند فقط شناسه‌ی *تصمیم* (`resolutionId`) می‌خواهد؛ `returnId`/`claimId` فقط برای رفرشِ کش فرانت لازم بودند. */
export async function removeClaimResolution(returnId, claimId, resolutionId) {
  const { data } = await axiosInstance.delete("/SaleReturn/RemoveClaimResolution", {
    params: { id: resolutionId },
  });
  return fromApiSaleReturn(data);
}

/**
 * یک دور اجرای اثرهای کالایی — قرینه‌ی سمتِ خرید.
 *
 * فیلدِ شناسه روی بدنه‌ی سمتِ فروش `SaleReturnId` است (در برابرِ
 * `PurchaseReturnId` سمتِ خرید) — تأیید شده از روی کدِ بکند
 * (`ExecuteGoodsRoundCommand.cs` سمتِ `SaleReturn`).
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
  return fromApiSaleReturn(data);
}

/** ثبتِ پرداختِ یک اثر مالیِ معلق — قرینه‌ی سمتِ خرید. */
export async function executeMoneyEffect(
  { effectId, paidAt, reference },
  { idempotencyKey } = {},
) {
  const { data } = await axiosInstance.post(
    "/SaleReturn/ExecuteMoneyEffect",
    { effectId, paidAt: paidAt || undefined, reference: reference || undefined },
    idempotent(idempotencyKey),
  );
  return fromApiSaleReturn(data);
}

// ─── چرخه‌ی عمر ─────────────────────────────────────────────────────────────

/** `reason` اختیاری است؛ قرینه‌ی `rejectPurchaseReturn`. */
export async function rejectSalesReturn(returnId, reason) {
  const { data } = await axiosInstance.post("/SaleReturn/RejectSaleReturn", {
    id: returnId,
    reason: reason?.trim() || undefined,
  });
  return fromApiSaleReturn(data);
}

export async function cancelSalesReturn(returnId, reason) {
  const { data } = await axiosInstance.post("/SaleReturn/CancelSaleReturn", {
    id: returnId,
    reason: reason?.trim() || undefined,
  });
  return fromApiSaleReturn(data);
}

export async function reopenSalesReturn(returnId) {
  const { data } = await axiosInstance.post("/SaleReturn/ReopenSaleReturn", {
    id: returnId,
  });
  return fromApiSaleReturn(data);
}

export async function removeSalesReturn(returnId) {
  const { data } = await axiosInstance.delete("/SaleReturn/DeleteSaleReturn", {
    params: { id: returnId },
  });
  // پاسخِ حذف هم سند را برمی‌گرداند: لایه‌ی mutation برای پاک‌کردن کش و
  // بازگرداندن کاربر به لیست، به `id` و `saleId` نیاز دارد.
  return fromApiSaleReturn(data) ?? { id: returnId };
}

/**
 * `PUT UpdateSaleReturnAttachments` — پیوست‌های مرجوعی (رسیدِ امضاشده، عکسِ
 * کالا). جایگزینیِ کامل (فهرستِ نهایی فرستاده می‌شود) و در هر وضعیتی؛
 * پاسخ سندِ کاملِ مرجوعی است.
 */
export async function updateSalesReturnAttachments(returnId, attachments) {
  const { data } = await axiosInstance.put("/SaleReturn/UpdateSaleReturnAttachments", {
    id: returnId,
    attachments: toApiAttachments(attachments),
  });
  return fromApiSaleReturn(data);
}
