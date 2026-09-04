import axiosInstance from "@/shared/services/api/axios";
import { idempotent, normalizeListResponse } from "@/shared/services/api/contract";

/**
 * نسخه‌ی هماهنگ‌شده با بکندِ واقعی برای ارسال انبار (بخش ۷ گزارشِ
 * شکافِ خرید/فروش). قرینه‌ی دقیقِ `warehouse/receiving/services/api-v1.js`
 * — همان سه هشدارِ آن‌جا اینجا هم برقرار است:
 *
 *  ۱. کنترلر جداگانه‌ای برای انبار نیست؛ «ارسال» همان
 *     `POST api/Sale/ShipSale` روی کنترلرِ فروش است.
 *  ۲. endpointِ «صف ارسال» وجود ندارد.
 *  ۳. بکند دیگر مغایرتِ حینِ ارسال قبول نمی‌کند — چیزی مشابهِ
 *     `issues[]` برای فروش هم در `ShipSale` نیست.
 */

/** ⚠️ معادلِ واقعی ندارد. جایگزینِ تقریبی: فروش‌هایی که هنوز کامل ارسال نشده‌اند. */
export async function fetchOutgoingQueue(params = {}) {
  const { data } = await axiosInstance.get("/Sale/GetSaleList", {
    params: {
      page: params.page,
      take: params.limit,
      status: 1, // SalesStatusEnum.PROCESSING — نگاه کنید به گزارشِ شکاف برای شماره‌ی درستِ enum.
    },
  });
  return normalizeListResponse(data, { itemsKey: "saleList" });
}

/** فروش به‌همراه `items[].shippedQuantity`ِ هر قلم برای محاسبه‌ی باقیمانده‌ی قابل‌ارسال. */
export async function fetchShippingSaleById(id) {
  const { data } = await axiosInstance.get("/Sale/GetSaleDetail", {
    params: { id },
  });
  return data;
}

/**
 * ⚠️ شکلِ بدنه با بکند فرق دارد و باید ترجمه شود: بکند `{saleId,
 * shippedDate?, shippingNote?, driverFullName?, driverPhoneNumber?,
 * vehiclePlate?, items:[{saleItemId, shippedQuantity,
 * productUnitBarcodes?}]}` می‌خواهد — بدون `source`؛ سهمِ مرجوعیِ خرید
 * (عودتِ جایگزین به تامین‌کننده) بخشی از این درخواست نیست، باید جدا با
 * `confirmSupplierReturnShipment` ثبت شود.
 *
 * `shipmentData` همان چیزی است که `useShippingForm().buildPayload()`
 * می‌سازد (شکلِ فرم/mock: `shippedItems[].shippedQuantity` با
 * `driverName`/`driverPhone`) — نه از قبل شکلِ بکند؛ اینجا ترجمه
 * می‌شود، دقیقاً مثلِ `confirmReceiving` در فایلِ خواهرش.
 *
 * `saleItemId` را استور از پاسخِ `GetSaleDetail` (`item.id` روی
 * `SaleItem`) روی هر ردیف نگه داشته (`shippingFormStore.initializeFromSale`)؛
 * ردیف‌های مرجوعی (`source: RETURN`) چون `saleItemId` ندارند، از این
 * درخواست کنار گذاشته می‌شوند.
 */
export async function confirmShipment(
  saleId,
  shipmentData,
  { idempotencyKey } = {},
) {
  const items = (shipmentData.shippedItems || [])
    .filter((row) => row.saleItemId != null && (Number(row.shippedQuantity) || 0) > 0)
    .map((row) => ({
      saleItemId: row.saleItemId,
      shippedQuantity: Number(row.shippedQuantity) || 0,
      productUnitBarcodes: row.productUnitBarcodes || null,
    }));

  const { data } = await axiosInstance.post(
    "/Sale/ShipSale",
    {
      saleId,
      shippedDate: shipmentData.shippedDate,
      shippingNote: shipmentData.shippingNote,
      driverFullName: shipmentData.driverName || undefined,
      driverPhoneNumber: shipmentData.driverPhone || undefined,
      vehiclePlate: shipmentData.vehiclePlate || undefined,
      items,
    },
    // ⚠️ بکند این هدر را نمی‌خواند (گزارشِ شکاف، بخش ۶)؛ retry شبکه
    // همین حالا می‌تواند یک ارسال را دوبار از موجودی کم کند.
    idempotent(idempotencyKey),
  );
  return data;
}

/**
 * ⚠️ مسیر واقعی برای مرجوعی خرید است، نه انبارِ فروش — دقیقاً چیزی
 * است که این تابع از قبل هم صدا می‌زد، فقط با اسمِ REST قدیمی. عودتِ
 * کالا به تامین‌کننده در مدلِ Claim→Resolution→Effect یعنی اجرای یک
 * اثرِ `GOODS_OUT`، پس همان `ExecuteGoodsRound`ِ مرجوعیِ خرید است.
 */
export async function confirmSupplierReturnShipment(
  returnId,
  shipmentData,
  { idempotencyKey } = {},
) {
  const { data } = await axiosInstance.post(
    "/PurchaseReturn/ExecuteGoodsRound",
    { purchaseReturnId: returnId, ...shipmentData },
    idempotent(idempotencyKey),
  );
  return data;
}
