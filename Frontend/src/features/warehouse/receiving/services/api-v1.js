import axiosInstance from "@/shared/services/api/axios";
import { idempotent, normalizeListResponse } from "@/shared/services/api/contract";
import { PurchaseStatusEnum } from "@/shared/domain/enums/purchaseStatus";

/**
 * دریافت انبار روی بکندِ واقعی — کنترلر جداگانه‌ای برای انبار وجود
 * ندارد و این ماژول سه endpoint از دو کنترلرِ دیگر را به هم می‌دوزد:
 *
 *  ۱. صفِ دریافت = `GET api/Purchase/GetPurchaseList` فیلترشده روی
 *     وضعیت‌های قابلِ دریافت (`RECEIVING_ELIGIBLE_STATUSES`).
 *  ۲. جزئیاتِ یک خرید برای انبار = `GET api/PurchaseReturn/GetPurchaseReceivingInfo`
 *     (`PurchaseReceivingInfoDto`؛ باقیمانده‌ی هر قلم را هم می‌دهد).
 *  ۳. ثبتِ دریافت = `POST api/Purchase/ReceivePurchase`.
 *
 * `ReceivePurchaseCommand` فقط مقدارِ دریافتی را می‌گیرد: مغایرت
 * (کسری/آسیب/اشتباه) عمداً از این دستور حذف شده و باید جدا با
 * `POST api/PurchaseReturn/CreatePurchaseReturn` ثبت شود. به همین دلیل
 * فرمِ این صفحه هم فقط تعداد و مشخصاتِ محموله را می‌گیرد.
 */

/** خریدهایی که هنوز کالایشان به انبار نرسیده (کاملاً یا بخشی). */
export async function fetchReceivablePurchases(params = {}) {
  const { data } = await axiosInstance.get("/Purchase/GetPurchaseList", {
    params: {
      page: params.page,
      take: params.limit,
      invoiceNumber: params.search || undefined,
      supplierId: params.supplierId || undefined,
      status: params.status !== "" ? params.status : PurchaseStatusEnum.SHIPPED,
      fromDate: params.fromDate || undefined,
      toDate: params.toDate || undefined,
      // search آزاد و sortBy/sortOrder روی این لیست پشتیبانی نمی‌شوند.
    },
  });
  return normalizeListResponse(data, { itemsKey: "purchaseList" });
}

/** `PurchaseReceivingInfoDto`: سرِ سند، اقلام با `stillOwedQuantity`، و عکس‌های دورهای قبل. */
export async function fetchPurchaseReceivingInfo(purchaseId) {
  const { data } = await axiosInstance.get("/PurchaseReturn/GetPurchaseReceivingInfo", {
    params: { purchaseId },
  });
  return data;
}

/**
 * یک دورِ دریافت. `command` دقیقاً بدنه‌ی `ReceivePurchaseCommand` است و
 * `useReceivingForm().buildCommand()` آن را می‌سازد — اینجا هیچ ترجمه‌ای
 * لازم نیست چون نام‌های فرم همان نام‌های دستورند.
 */
export async function receivePurchase(command, { idempotencyKey } = {}) {
  const { data } = await axiosInstance.post(
    "/Purchase/ReceivePurchase",
    command,
    // ⚠️ بکند این هدر را هنوز نمی‌خواند؛ retry شبکه می‌تواند یک دریافت را
    // دوبار به موجودی اضافه کند.
    idempotent(idempotencyKey),
  );
  return data;
}
