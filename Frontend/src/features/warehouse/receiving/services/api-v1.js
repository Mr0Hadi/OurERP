import axiosInstance from "@/shared/services/api/axios";
import { idempotent, normalizeListResponse } from "@/shared/services/api/contract";
import { receivingStatusesOf } from "../domain/receivingVocabulary";

/**
 * دریافت انبار روی بکندِ واقعی:
 *
 *  ۱. صفِ دریافت = `GET api/Purchase/GetPurchaseList` فیلترشده با `statuses`
 *     روی وضعیت‌های قابلِ دریافت (`receivingStatusesOf`).
 *  ۲. جزئیاتِ یک خرید برای انبار = `GET api/PurchaseReturn/GetPurchaseReceivingInfo`
 *     (باقیمانده، قرنطینه و مغایرت‌های هر قلم).
 *  ۳. کالای جایگزینِ منتظرِ ورود = `GET api/PurchaseReturn/GetPurchaseReturnPendingEffects`.
 *  ۴. ثبت = `POST api/Shipment/ReceiveShipment` — دریافتِ خرید و دورهای
 *     ورودِ مرجوعی در یک تراکنش؛ یک محموله یک رسید است.
 */

/**
 * خریدهایی که هنوز کالایشان به انبار نرسیده (کاملاً یا بخشی).
 *
 * `statuses` به شکلِ `statuses=2&statuses=3` فرستاده می‌شود (همان شکلی که
 * ASP.NET برای `List<>` می‌خواند). بکندِ تازه همین را فیلتر می‌کند؛ ردیف‌ها
 * یک بار دیگر هم اینجا فیلتر می‌شوند تا روی سرورِ قدیمی‌تر (که `statuses`
 * را نمی‌شناسد) صف هرگز پیش‌فاکتور یا خریدِ لغوشده نشان ندهد.
 *
 * جست‌وجو فقط روی شماره‌ی فاکتور است (`invoiceNumber`)؛ تامین‌کننده
 * فیلترِ جدای خودش را دارد.
 */
export async function fetchReceivablePurchases(params = {}) {
  const statuses = receivingStatusesOf(params.status);
  const { data } = await axiosInstance.get("/Purchase/GetPurchaseList", {
    params: {
      page: params.page,
      take: params.limit,
      invoiceNumber: params.search || undefined,
      supplierId: params.supplierId || undefined,
      statuses,
      fromDate: params.fromDate || undefined,
      toDate: params.toDate || undefined,
    },
    paramsSerializer: { indexes: null },
  });
  const list = normalizeListResponse(data, { itemsKey: "purchaseList" });
  const allowed = new Set(statuses);
  return {
    ...list,
    items: list.items.filter((purchase) => allowed.has(Number(purchase.status))),
  };
}

/** `PurchaseReceivingInfoDto`: اقلام با باقیمانده و قرنطینه، کالای سفارش‌نداده، مغایرت‌ها و عکس‌ها. */
export async function fetchPurchaseReceivingInfo(purchaseId) {
  const { data } = await axiosInstance.get("/PurchaseReturn/GetPurchaseReceivingInfo", {
    params: { purchaseId },
  });
  return data;
}

/** اثرهای کالاییِ معلقِ مرجوعی‌های خرید روی این خرید (هر دو جهت؛ فراخوان فیلتر می‌کند). */
export async function fetchPurchaseReturnPendingEffects(purchaseId) {
  const { data } = await axiosInstance.get(
    "/PurchaseReturn/GetPurchaseReturnPendingEffects",
    { params: { purchaseId } },
  );
  return data?.pendingEffects ?? [];
}

/**
 * یک رسیدِ کامل: `{ purchase?, purchaseReturnRounds[], saleReturnRounds[] }`.
 * هر بخش دقیقاً بدنه‌ی دستورِ مستقلِ خودش است و خطای هر بخش کلِ رسید را
 * برمی‌گرداند. خروجی `{ purchase, purchaseReturns, saleReturns }`.
 */
export async function receiveShipment(command, { idempotencyKey } = {}) {
  const { data } = await axiosInstance.post(
    "/Shipment/ReceiveShipment",
    command,
    // ⚠️ بکند این هدر را هنوز نمی‌خواند؛ retry شبکه می‌تواند یک دریافت را
    // دوبار به موجودی اضافه کند.
    idempotent(idempotencyKey),
  );
  return data;
}
