import axiosInstance from "@/shared/services/api/axios";
import { toApiSort } from "@/shared/services/api/sorting";
import { SALE_SORT_COLUMNS } from "@/features/sales/orders/services/api-v1";
import { idempotent, normalizeListResponse } from "@/shared/services/api/contract";
import { shippingStatusesOf } from "../domain/shippingVocabulary";

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
 * (درخواستِ بند ۸ در `Backend-Net/docs/sale-frontend-sync-requests.fa.md`)؛
 * ردیف‌ها یک بار دیگر هم با همین فهرست فیلتر می‌شوند تا پیش‌فاکتور یا
 * لغوشده هرگز در صف نیاید.
 */
export async function fetchShippableSales(params = {}) {
  const statuses = shippingStatusesOf(params.status);
  const { data } = await axiosInstance.get("/Sale/GetSaleList", {
    params: {
      page: params.page,
      take: params.limit,
      invoiceNumber: params.search || undefined,
      // `GetSaleListQuery` فیلترِ `CustomerId` ندارد — فقط `CustomerName`.
      customerName: params.customerName || undefined,
      statuses,
      fromDate: params.fromDate || undefined,
      toDate: params.toDate || undefined,
      ...toApiSort(params.sorting, SALE_SORT_COLUMNS),
    },
    paramsSerializer: { indexes: null },
  });
  const list = normalizeListResponse(data, { itemsKey: "saleList" });
  const allowed = new Set(statuses);
  return {
    ...list,
    items: list.items.filter((sale) => allowed.has(Number(sale.status))),
  };
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
