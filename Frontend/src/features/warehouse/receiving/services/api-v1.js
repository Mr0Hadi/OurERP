import axiosInstance from "@/shared/services/api/axios";

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
      page: params.page,
      limit: params.limit,
      search: params.search || undefined,
      type: params.type || undefined,
      counterpartyIds: params.counterpartyIds?.length
        ? params.counterpartyIds
        : undefined,
      fromDate: params.fromDate || undefined,
      toDate: params.toDate || undefined,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
    },
  });
  return data;
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
 * ردیف‌هایی که source آن‌ها return است، سهمِ مرجوعی‌اند و سرور باید
 * آن‌ها را روی اثرهای همان مرجوعی اعمال کند.
 */
export async function confirmReceiving(purchaseId, receivingData) {
  const { data } = await axiosInstance.post(
    `/purchases/${purchaseId}/receiving/confirm`,
    receivingData,
  );
  return data;
}

/** تحویل‌گرفتن کالای برگشتی از مشتری؛ همان شکلِ payload دریافت خرید. */
export async function confirmReturnIntake(returnId, intakeData) {
  const { data } = await axiosInstance.post(
    `/sales-returns/${returnId}/intake`,
    intakeData,
  );
  return data;
}
