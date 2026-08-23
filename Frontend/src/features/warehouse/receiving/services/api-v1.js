import axiosInstance from "@/shared/services/api/axios";
import {
  idempotent,
  listParams,
  normalizeListResponse,
} from "@/shared/services/api/contract";

/**
 * نسخه‌ی واقعیِ APIِ دریافت انبار.
 *
 * سطحش دقیقاً همان چهار تابعِ api-mockData است — نه بیشتر، نه کمتر.
 * مهاجرت یعنی عوض‌کردن `./api-mockData` به `./api-v1` در queries.js و
 * mutations.js؛ هیچ کامپوننت و هوکی دست نمی‌خورد.
 *
 * توابعِ کمکیِ داخلیِ mock (محاسبه‌ی باقیمانده، ساختن ردیف‌های صف،
 * ترجمه‌ی ردیف به دورِ اثر) اینجا معادلی ندارند و نباید داشته باشند:
 * آن‌ها کارِ سرورند.
 */

export async function fetchIncomingQueue(params = {}) {
  const { data } = await axiosInstance.get("/warehouse/receiving/queue", {
    params: {
      ...listParams(params),
      type: params.type || undefined,
      counterpartyIds: params.counterpartyIds?.length
        ? params.counterpartyIds
        : undefined,
    },
  });
  return normalizeListResponse(data, { itemsKey: "incomingList" });
}

/** خرید به‌همراه receivableQty هر قلم و returnLines معلقِ همان خرید. */
export async function fetchReceivingPurchaseById(id) {
  const { data } = await axiosInstance.get(`/purchases/${id}/receiving`);
  return data;
}

/**
 * receivingData علاوه بر receivedItems (که هر ردیفش source و issues و
 * excessQty دارد) یک آرایه‌ی unknownItems هم حمل می‌کند: کالاهایی که
 * نه در این سفارش‌اند و نه در فهرست کالاها، پس فقط شرح و تعداد دارند.
 *
 * `issues` دو معنای متفاوت دارد که با `source` تعیین می‌شود:
 *
 *  • source = order  → بخشی از سفارش که سالم نرسیده؛ سرور از آن یک
 *    *ادعا* روی تامین‌کننده می‌سازد.
 *  • source = return → مشاهده‌ی انباردار روی کالای برگشتی؛ سرور آن را
 *    به‌عنوان `observations` روی اثرِ همان مرجوعی ثبت می‌کند و مقدار
 *    سالم را از آن مشتق می‌کند.
 *
 * دریافت تجمعی است، پس کلید ایدمپوتنسی اجباری است: تکرارِ یک درخواست
 * نباید موجودی را دوبار بالا ببرد.
 */
export async function confirmReceiving(
  purchaseId,
  receivingData,
  { idempotencyKey } = {},
) {
  const { data } = await axiosInstance.post(
    `/purchases/${purchaseId}/receiving/confirm`,
    receivingData,
    idempotent(idempotencyKey),
  );
  return data;
}

/** تحویل‌گرفتن کالای برگشتی از مشتری؛ همان شکلِ payload دریافت خرید. */
export async function confirmReturnIntake(
  returnId,
  intakeData,
  { idempotencyKey } = {},
) {
  const { data } = await axiosInstance.post(
    `/sales-returns/${returnId}/intake`,
    intakeData,
    idempotent(idempotencyKey),
  );
  return data;
}
