import axiosInstance from "@/shared/services/api/axios";
import { idempotent, normalizeListResponse } from "@/shared/services/api/contract";

/**
 * ارسال انبار روی بکندِ واقعی — قرینه‌ی `warehouse/receiving/services/api-v1.js`:
 *
 *  ۱. صفِ ارسال = `GET api/Sale/GetSaleList` فیلترشده روی وضعیت‌های
 *     قابلِ ارسال (`SHIPPING_ELIGIBLE_STATUSES`).
 *  ۲. جزئیاتِ یک فروش = `GET api/Sale/GetSaleDetail`.
 *  ۳. کالای جایگزینِ منتظرِ ارسال = `GET api/SaleReturn/GetSaleReturnPendingEffects`.
 *  ۴. ثبت = `POST api/Shipment/DispatchShipment` — ارسالِ فروش و دورهای
 *     خروجِ مرجوعی در یک تراکنش.
 */

/** فروش‌هایی که هنوز کالایشان کامل از انبار خارج نشده. */
/**
 * صفِ ارسال. `statuses` به شکلِ `statuses=1&statuses=2` فرستاده می‌شود
 * (درخواستِ بند ۸ در `Backend-Net/docs/frontend-requests.fa.md` بخشِ ۳)؛
 * ردیف‌ها یک بار دیگر هم با همین فهرست فیلتر می‌شوند تا پیش‌فاکتور یا
 * لغوشده هرگز در صف نیاید.
 */
export async function fetchShippableSales(params) {
  const { data } = await axiosInstance.get("/Sale/GetSaleList", { params });
  const list = normalizeListResponse(data, { itemsKey: "saleList" });
  // `GetSaleListQuery` هنوز `Statuses` ندارد (بخشِ ۳ سندِ frontend-requests.fa.md)
  // و فقط `status` تکی را می‌فهمد؛ تا آن وقت ردیف‌ها اینجا فیلتر می‌شوند —
  // برای همین صفحه ممکن است کمتر از `take` ردیف نشان دهد.
  const allowed = new Set(params.statuses);
  return { ...list, items: list.items.filter((sale) => allowed.has(Number(sale.status))) };
}

export async function fetchSaleForShipping(id) {
  const { data } = await axiosInstance.get("/Sale/GetSaleDetail", {
    params: { id },
  });
  return data;
}

/** اثرهای کالاییِ معلقِ مرجوعی‌های فروش روی این فروش (هر دو جهت؛ فراخوان فیلتر می‌کند). */
export async function fetchSaleReturnPendingEffects(saleId) {
  const { data } = await axiosInstance.get("/SaleReturn/GetSaleReturnPendingEffects", {
    params: { saleId },
  });
  return data?.pendingEffects ?? [];
}

/**
 * یک محموله‌ی خروجی: `{ sale?, saleReturnRounds[], purchaseReturnRounds[] }`.
 * خروجی `{ sale, saleReturns, purchaseReturns }`.
 */
export async function dispatchShipment(command, { idempotencyKey } = {}) {
  const { data } = await axiosInstance.post(
    "/Shipment/DispatchShipment",
    command,
    // ⚠️ بکند این هدر را هنوز نمی‌خواند؛ retry شبکه می‌تواند یک ارسال را
    // دوبار از موجودی کم کند.
    idempotent(idempotencyKey),
  );
  return data;
}
