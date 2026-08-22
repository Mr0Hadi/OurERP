import axiosInstance from "@/shared/services/api/axios";

/**
 * نسخه‌ی واقعیِ APIِ مرجوعی فروش.
 *
 * سطحش دقیقاً همان چیزی است که queries.js و mutations.js از
 * api-mockData می‌گیرند. مهاجرت یعنی عوض‌کردن `./api-mockData` به
 * `./api-v1` در آن دو فایل.
 *
 * «موتور اثر» معادلی اینجا ندارد و نباید داشته باشد: محاسبه‌ی اینکه یک
 * تصمیم به چه اثرهایی باز می‌شود، چه بر موجودی و مبلغ فروش می‌گذارد و
 * وضعیت مرجوعی چه می‌شود، کارِ سرور است. فرانت فقط تصمیم را می‌فرستد و
 * سندِ به‌روزشده را می‌گیرد.
 */

// ─── خواندن ─────────────────────────────────────────────────────────────────

export async function fetchSalesReturns(params = {}) {
  const { data } = await axiosInstance.get("/sales-returns", {
    params: {
      page: params.page,
      limit: params.limit,
      search: params.search || undefined,
      customerIds: params.customerIds?.length ? params.customerIds : undefined,
      status: params.status || undefined,
      problem: params.problem || undefined,
      scope: params.scope || undefined,
      fromDate: params.fromDate || undefined,
      toDate: params.toDate || undefined,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
    },
  });
  return data;
}

export async function fetchSalesReturnById(id) {
  const { data } = await axiosInstance.get(`/sales-returns/${id}`);
  return data;
}

/** فهرست کوتاهِ فروش‌های قابل‌مرجوع برای انتخابگر فرم. */
export async function fetchReturnableSales(search = "") {
  const { data } = await axiosInstance.get("/sales", {
    params: { search: search || undefined, returnable: true, limit: 30 },
  });
  return data;
}

/**
 * اقلام یک فروش به‌همراه سقف ادعا و مقدارِ ادعاشده در مرجوعی‌های دیگر.
 * excludeReturnId برای فرم ویرایش است تا ادعاهای خودِ همان مرجوعی دوبار
 * شمرده نشوند.
 */
export async function fetchSaleForReturn(saleId, excludeReturnId = null) {
  const { data } = await axiosInstance.get(`/sales/${saleId}/for-return`, {
    params: { excludeReturnId: excludeReturnId ?? undefined },
  });
  return data;
}

// ─── نوشتن ──────────────────────────────────────────────────────────────────

export async function createSalesReturn(payload) {
  const { data } = await axiosInstance.post("/sales-returns", payload);
  return data;
}

/** ثبت یک تصمیم روی یک ادعا؛ سرور آن را به اثرها باز می‌کند. */
export async function addClaimResolution(returnId, claimId, composition) {
  const { data } = await axiosInstance.post(
    `/sales-returns/${returnId}/claims/${claimId}/resolutions`,
    composition,
  );
  return data;
}

export async function removeClaimResolution(returnId, claimId, resolutionId) {
  const { data } = await axiosInstance.delete(
    `/sales-returns/${returnId}/claims/${claimId}/resolutions/${resolutionId}`,
  );
  return data;
}

/**
 * یک دور اجرای اثرهای کالایی — وقتی انبار واقعاً کالا را جابه‌جا کرد.
 *
 * صفحات انبار این را مستقیم صدا نمی‌زنند؛ آن‌ها endpoint خودشان را
 * دارند و سرور از همان‌جا اثرها را می‌بندد. این مسیر برای وقتی است که
 * خودِ صفحه‌ی مرجوعی دور را ثبت کند.
 */
export async function executeGoodsRound(returnId, payload) {
  const { data } = await axiosInstance.post(
    `/sales-returns/${returnId}/goods-rounds`,
    payload,
  );
  return data;
}

export async function rejectSalesReturn(returnId, reason) {
  const { data } = await axiosInstance.post(`/sales-returns/${returnId}/reject`, {
    reason,
  });
  return data;
}

export async function cancelSalesReturn(returnId, reason) {
  const { data } = await axiosInstance.post(`/sales-returns/${returnId}/cancel`, {
    reason,
  });
  return data;
}

export async function reopenSalesReturn(returnId) {
  const { data } = await axiosInstance.post(`/sales-returns/${returnId}/reopen`);
  return data;
}

export async function removeSalesReturn(returnId) {
  const { data } = await axiosInstance.delete(`/sales-returns/${returnId}`);
  return data;
}
