// src/features/reports/services/api-v1.js
import axiosInstance from "@/shared/services/api/axios";
import { normalizeListResponse } from "@/shared/services/api/contract";

/**
 * چهار گزارشِ «فعالیت» روی کنترلر `api/Report` — رتبه‌بندیِ کارمندان،
 * مشتریان و تامین‌کنندگان.
 *
 * برخلافِ دو گزارشِ بازه‌ایِ داشبورد (`GetSaleReport`/`GetPurchaseReport`
 * که کلِ بازه را یک‌جا می‌دهند)، این چهارتا **صفحه‌بندی دارند** و همان
 * پوششِ `{ <items>, page: {...} }`ِ بقیه‌ی فهرست‌ها را برمی‌گردانند؛ پس
 * از همان `normalizeListResponse` رد می‌شوند تا شکلِ خروجی همه‌جا
 * `{ items, total, page, totalPages }` بماند.
 *
 * دو نکته‌ی قرارداد:
 *  - مرتب‌سازی **همیشه** نزولی بر اساس مبلغ کل است و پارامتری برای
 *    عوض‌کردنش وجود ندارد؛ جدول‌ها هم به همین دلیل سرتیترِ قابل‌کلیک
 *    ندارند (`sortable={false}`).
 *  - بازه بر اساس **تاریخ فاکتور** (`invoiceDate`) فیلتر می‌شود، نه
 *    تاریخِ ارسال/دریافت فیزیکی.
 */

/** تاریخِ خالی روی سیم نمی‌رود؛ سرور آن را «نامعتبر» می‌بیند نه «نفرستاده». */
const rangeParams = ({ page, limit, fromDate = "", toDate = "" } = {}) => ({
  page,
  take: limit,
  fromDate: fromDate || undefined,
  toDate: toDate || undefined,
});

/**
 * `GET api/Report/GetSalesPerformanceByEmployee`
 *
 * فروش‌هایی که `salesUserId` ندارند (سندهای قبل از افزودنِ این فیلد) در
 * سرور کنار گذاشته می‌شوند، نه اینکه زیر یک کارمندِ ساختگیِ «نامشخص»
 * جمع شوند — پس جمعِ این جدول می‌تواند از کلِ فروش کمتر باشد.
 */
export async function fetchSalesPerformanceByEmployee(params = {}) {
  const { data } = await axiosInstance.get("/Report/GetSalesPerformanceByEmployee", {
    params: rangeParams(params),
  });
  return normalizeListResponse(data, { itemsKey: "employees" });
}

/** `GET api/Report/GetSupplyPerformanceByEmployee` — همان، روی `purchasingUserId`. */
export async function fetchSupplyPerformanceByEmployee(params = {}) {
  const { data } = await axiosInstance.get("/Report/GetSupplyPerformanceByEmployee", {
    params: rangeParams(params),
  });
  return normalizeListResponse(data, { itemsKey: "employees" });
}

/** `GET api/Report/GetCustomerPurchaseStatistics` — رتبه‌بندی مشتریان بر اساس خریدشان. */
export async function fetchCustomerPurchaseStatistics(params = {}) {
  const { data } = await axiosInstance.get("/Report/GetCustomerPurchaseStatistics", {
    params: rangeParams(params),
  });
  return normalizeListResponse(data, { itemsKey: "customers" });
}

/** `GET api/Report/GetSupplierSalesStatistics` — رتبه‌بندی تامین‌کنندگان بر اساس خریدِ ما از آن‌ها. */
export async function fetchSupplierSalesStatistics(params = {}) {
  const { data } = await axiosInstance.get("/Report/GetSupplierSalesStatistics", {
    params: rangeParams(params),
  });
  return normalizeListResponse(data, { itemsKey: "suppliers" });
}
