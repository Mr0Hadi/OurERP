import axiosInstance from "@/shared/services/api/axios";
import { idempotent, normalizeListResponse } from "@/shared/services/api/contract";
import { SaleStatusEnum } from "@/shared/domain/enums/saleStatus";

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
export async function fetchShippableSales(params = {}) {
  const { data } = await axiosInstance.get("/Sale/GetSaleList", {
    params: {
      page: params.page,
      take: params.limit,
      invoiceNumber: params.search || undefined,
      // `GetSaleListQuery` فیلترِ `CustomerId` ندارد — فقط `CustomerName`.
      customerName: params.customerName || undefined,
      status: params.status !== "" ? params.status : SaleStatusEnum.PROCESSING,
      fromDate: params.fromDate || undefined,
      toDate: params.toDate || undefined,
    },
  });
  return normalizeListResponse(data, { itemsKey: "saleList" });
}

/** `SaleDto` — اقلامش `id`/`quantity`/`shippedQuantity` دارند. */
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
