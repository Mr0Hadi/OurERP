import axiosInstance from "@/shared/services/api/axios";
import { idempotent, normalizeListResponse } from "@/shared/services/api/contract";
import { SaleStatusEnum } from "@/shared/domain/enums/saleStatus";

/**
 * ارسال انبار روی بکندِ واقعی — قرینه‌ی دقیقِ
 * `warehouse/receiving/services/api-v1.js`:
 *
 *  ۱. صفِ ارسال = `GET api/Sale/GetSaleList` فیلترشده روی وضعیت‌های
 *     قابلِ ارسال (`SHIPPING_ELIGIBLE_STATUSES`).
 *  ۲. جزئیاتِ یک فروش = `GET api/Sale/GetSaleDetail` (`SaleDto`؛
 *     باقیمانده‌ی هر قلم از `quantity - shippedQuantity` درمی‌آید،
 *     چون معادلِ `GetPurchaseReceivingInfo` سمتِ فروش وجود ندارد).
 *  ۳. ثبتِ ارسال = `POST api/Sale/ShipSale`.
 *
 * عودتِ کالا به تامین‌کننده در این ماژول نیست: آن یک دورِ اثرِ
 * `GOODS_OUT` روی مرجوعیِ خرید است و از
 * `features/purchases/returns/services` می‌آید.
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

/**
 * یک دورِ ارسال. `command` دقیقاً بدنه‌ی `ShipSaleCommand` است و
 * `useShippingForm().buildCommand()` آن را می‌سازد.
 */
export async function shipSale(command, { idempotencyKey } = {}) {
  const { data } = await axiosInstance.post(
    "/Sale/ShipSale",
    command,
    // ⚠️ بکند این هدر را هنوز نمی‌خواند؛ retry شبکه می‌تواند یک ارسال را
    // دوبار از موجودی کم کند.
    idempotent(idempotencyKey),
  );
  return data;
}
