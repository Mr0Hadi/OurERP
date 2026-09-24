import axiosInstance from "@/shared/services/api/axios";
import {
  idempotent,
  normalizeListResponse,
} from "@/shared/services/api/contract";
import { toApiClaim, fromApiReturn } from "./apiMapping";
import { toApiComposition } from "@/shared/domain/returns/resolutions";
import { toApiSort } from "@/shared/services/api/sorting";
import { RETURNABLE_SALE_STATUSES } from "@/features/sales/orders/domain/saleRules";

/** `SaleReturnListSortEnum`ِ بکند، بر اساسِ شناسه‌ی ستونِ جدول. */
const SALE_RETURN_SORT_COLUMNS = {
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
      // مرجوعی‌های همین فروش — کارتِ «مرجوعی‌های دیگر همین فروش» در
      // صفحه‌ی جزئیات از همین فیلتر استفاده می‌کند.
      saleId: params.saleId || undefined,
      customerId: params.customerId || undefined,
      status: params.status !== "" ? params.status : undefined,
      problem: params.problem !== "" ? params.problem : undefined,
      fromDate: params.fromDate || undefined,
      toDate: params.toDate || undefined,
      ...toApiSort(params.sorting, SALE_RETURN_SORT_COLUMNS),
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

/**
 * فهرست کوتاهِ فروش‌های قابل‌مرجوع برای انتخابگر فرم. بکند `returnable`
 * ندارد؛ فروش‌هایی که `CreateSaleReturn` رد می‌کند (هنوز ارسال‌نشده، لغو یا
 * مرجوع‌شده) همین‌جا کنار گذاشته می‌شوند.
 */
export async function fetchReturnableSales(search = "") {
  const { data } = await axiosInstance.get("/Sale/GetSaleList", {
    params: { invoiceNumber: search || undefined, take: 30 },
  });
  return normalizeListResponse(data, { itemsKey: "saleList" }).items.filter((sale) =>
    RETURNABLE_SALE_STATUSES.includes(Number(sale.status)),
  );
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
  return fromApiReturn(data);
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
