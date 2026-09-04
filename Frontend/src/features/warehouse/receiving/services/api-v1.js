import axiosInstance from "@/shared/services/api/axios";
import { idempotent, normalizeListResponse } from "@/shared/services/api/contract";

/**
 * نسخه‌ی هماهنگ‌شده با بکندِ واقعی برای دریافت انبار (بخش ۷ گزارشِ
 * شکافِ خرید/فروش). ⚠️ برخلاف بقیه‌ی ماژول‌ها، اینجا هماهنگ‌سازی صرفاً
 * اسمی نیست — چند تغییرِ رفتاری واقعی هم هست:
 *
 *  ۱. **کنترلر جداگانه‌ای برای انبار وجود ندارد.** «دریافت» همان
 *     `POST api/Purchase/ReceivePurchase` روی کنترلرِ خرید است.
 *
 *  ۲. **endpointِ «صف دریافت» اصلاً وجود ندارد.** نزدیک‌ترین معادل،
 *     فیلترکردنِ `GET api/Purchase/GetPurchaseList?status=SHIPPED` است
 *     (خریدهایی که تامین‌کننده فرستاده ولی هنوز کامل نرسیده)؛ سهمِ
 *     «کالای برگشتیِ مشتری که باید تحویل گرفته شود» (مرجوعیِ فروش) در
 *     همین صف قابلِ ادغام نیست چون بکند چنین لیستِ ترکیبی‌ای ندارد.
 *
 *  ۳. **بکند دیگر `issues[]` قبول نمی‌کند.** طبق سندِ خودِ بکند، این
 *     یک تغییرِ عمدیِ نسخه‌ی جدید است: `ReceivePurchase` فقط مقدارِ
 *     سالمِ دریافتی را می‌گیرد؛ مغایرت (کسری/آسیب/اشتباه) باید کاملاً
 *     جدا با `POST api/PurchaseReturn/CreatePurchaseReturn` ثبت شود.
 *     یعنی این فایل به‌تنهایی کافی نیست — صفحه‌ی دریافت باید به دو
 *     مرحله تقسیم شود؛ آن بازطراحی اینجا انجام نشده.
 */

/**
 * ⚠️ معادلِ واقعی ندارد. جایگزینِ تقریبی: خریدهای «ارسال‌شده».
 * سهمِ کالای برگشتیِ مشتری (RECEIVING_SOURCES.RETURN) در این نتیجه
 * نیست — بکند چیزی برای آن ندارد.
 */
export async function fetchIncomingQueue(params = {}) {
  const { data } = await axiosInstance.get("/Purchase/GetPurchaseList", {
    params: {
      page: params.page,
      take: params.limit,
      status: 1, // PurchaseStatusEnum.SHIPPED — نگاه کنید به گزارشِ شکاف برای شماره‌ی درستِ enum.
    },
  });
  return normalizeListResponse(data, { itemsKey: "purchaseList" });
}

/** خرید به‌همراه مقدارِ باقیمانده‌ی قابل‌دریافتِ هر قلم. */
export async function fetchReceivingPurchaseById(id) {
  const { data } = await axiosInstance.get("/PurchaseReturn/GetPurchaseReceivingInfo", {
    params: { purchaseId: id },
  });
  return data;
}

/**
 * ⚠️ شکلِ بدنه با بکند فرق دارد و باید ترجمه شود، نه فقط مسیر:
 * بکند `{purchaseId, receivedDate?, receivingNote?, driverFullName?,
 * driverPhoneNumber?, vehiclePlate?, items:[{purchaseItemId,
 * receivedQuantity}], images:[]}` می‌خواهد — بدون `issues`/`source`/
 * `unknownItems`/`excessQuantity`. مغایرت باید جدا با `createPurchaseReturn`
 * (فیچرِ مرجوعی خرید) ثبت شود، نه در همین درخواست.
 *
 * `receivingData` همان چیزی است که `useReceivingForm().buildPayload()`
 * می‌سازد (شکلِ فرم/mock: `receivedItems[].receivedQuantity` با
 * `transporterName`/`transporterPhone`) — نه از قبل شکلِ بکند. اینجا
 * دقیقاً همان کاری انجام می‌شود که `toApiItems`/`toApiPurchasePayload`
 * در `purchases/orders/services/api-v1.js` می‌کنند: ترجمه‌ی شکلِ فرم
 * به شکلِ کامند.
 *
 * `purchaseItemId` را استور از پاسخِ `GetPurchaseReceivingInfo` روی
 * هر ردیف نگه داشته (`receivingFormStore.initializeFromPurchase`)؛
 * بدونش این تابع نمی‌تواند خطوط را به کامند وصل کند. ردیف‌های مرجوعی
 * (`source: RETURN`) چون `purchaseItemId` ندارند، از این درخواست کنار
 * گذاشته می‌شوند — دریافتِ کالای برگشتی endpoint جدایی می‌خواهد که هنوز
 * روی بکند نیست (نگاه کنید به `confirmReturnIntake`).
 */
export async function confirmReceiving(
  purchaseId,
  receivingData,
  { idempotencyKey } = {},
) {
  const items = (receivingData.receivedItems || [])
    .filter((row) => row.purchaseItemId != null && (Number(row.receivedQuantity) || 0) > 0)
    .map((row) => ({
      purchaseItemId: row.purchaseItemId,
      receivedQuantity: Number(row.receivedQuantity) || 0,
    }));

  const { data } = await axiosInstance.post(
    "/Purchase/ReceivePurchase",
    {
      purchaseId,
      receivedDate: receivingData.receivedDate,
      receivingNote: receivingData.receivingNote,
      driverFullName: receivingData.transporterName || undefined,
      driverPhoneNumber: receivingData.transporterPhone || undefined,
      vehiclePlate: receivingData.vehiclePlate || undefined,
      items,
      images: receivingData.images || [],
    },
    // ⚠️ بکند این هدر را نمی‌خواند (گزارشِ شکاف، بخش ۶)؛ retry شبکه
    // همین حالا می‌تواند یک دریافت را دوبار به موجودی اضافه کند.
    idempotent(idempotencyKey),
  );
  return data;
}

/**
 * ⚠️ معادلِ واقعی ندارد. تحویل‌گرفتنِ کالای برگشتی از مشتری، سمتِ
 * بکند اصلاً بخشی از `ReceivePurchase`/کنترلرِ مرجوعیِ فروش نیست —
 * چیزی به‌اسمِ «intake» در بکند تعریف نشده. تا وقتی بکند این را
 * اضافه نکند، این تابع جایی برای صدازدن ندارد.
 */
export async function confirmReturnIntake() {
  throw new Error(
    "بکند فعلاً endpointِ تحویل‌گرفتنِ کالای برگشتی از مشتری ندارد — به گزارشِ شکافِ خرید/فروش مراجعه کنید.",
  );
}
