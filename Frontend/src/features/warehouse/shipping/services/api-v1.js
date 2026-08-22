import axiosInstance from "@/shared/services/api/axios";

/**
 * نسخه‌ی واقعیِ APIِ ارسال انبار — دقیقاً همان چهار تابعِ api-mockData.
 *
 * shipping تا امروز اصلاً api-v1 نداشت، در حالی که بقیه‌ی ماژول‌ها
 * داشتند؛ یعنی درزِ تعویض این سمت اصلاً وجود نداشت.
 */

export async function fetchOutgoingQueue(params = {}) {
  const { data } = await axiosInstance.get("/warehouse/shipping/queue", {
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

/** فروش به‌همراه shippableQty هر قلم و returnLines معلقِ همان فروش. */
export async function fetchShippingSaleById(id) {
  const { data } = await axiosInstance.get(`/sales/${id}/shipping`);
  return data;
}

/**
 * ردیف‌هایی که source آن‌ها return است سهمِ مرجوعی‌اند و سرور باید
 * آن‌ها را روی اثرهای همان مرجوعی اعمال کند، نه روی تعداد خودِ فروش.
 */
export async function confirmShipment(saleId, shipmentData) {
  const { data } = await axiosInstance.post(
    `/sales/${saleId}/shipping/confirm`,
    shipmentData,
  );
  return data;
}

/** عودت کالا به تامین‌کننده؛ همان شکلِ payload ارسال فروش. */
export async function confirmSupplierReturnShipment(returnId, shipmentData) {
  const { data } = await axiosInstance.post(
    `/purchase-returns/${returnId}/dispatch`,
    shipmentData,
  );
  return data;
}
