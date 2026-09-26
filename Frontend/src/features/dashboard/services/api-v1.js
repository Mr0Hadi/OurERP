import axiosInstance from "@/shared/services/api/axios";
import { DEFAULT_REPORT_PERIOD } from "@/shared/domain/enums/reportPeriod";
import { normalizeListResponse } from "@/shared/services/api/contract";

/**
 * نسخه‌ی سرورِ گزارش‌های داشبورد — نگاشتِ مستقیم روی `api/Report`
 * (بخش ۱۸ سند api-guide.fa.md).
 *
 * پوششِ `ResponseDto` را axios باز می‌کند، پس `data` همان محتوای `Data`
 * است؛ یعنی `{ periods: [...] }`.
 *
 * دو نکته که شکلِ این لایه را تعیین می‌کند:
 *
 *   ۱. **صفحه‌بندی ندارد.** برخلافِ همه‌ی فهرست‌های دیگر، این دو
 *      endpoint کلِ بازه را یک‌جا برمی‌گردانند؛ پس نه `listParams` لازم
 *      است و نه `normalizeListResponse`.
 *   ۲. `periodStart`/`periodEnd` **میلادی** برمی‌گردند، حتی وقتی
 *      گروه‌بندی شمسی است. تبدیل به شمسی کارِ لایه‌ی نمایش است، نه
 *      اینجا — تا شکلِ داده همان چیزی بماند که روی سیم آمده.
 *
 * تاریخِ خالی روی سیم نمی‌رود؛ سرور آن را «رشته‌ی نامعتبر» می‌بیند
 * به‌جای «نفرستاده». نفرستادن یعنی پیش‌فرضِ سرور: ۱۲ ماهِ اخیر.
 */

const reportParams = ({
  periodType = DEFAULT_REPORT_PERIOD,
  fromDate = "",
  toDate = "",
} = {}) => ({
  periodType,
  fromDate: fromDate || undefined,
  toDate: toDate || undefined,
});

/** سطرهای فروش: تعداد، مبلغ فاکتور، درآمد، بهای تمام‌شده و سود خالص. */
export async function fetchSaleReport(params = {}) {
  const { data } = await axiosInstance.get("/Report/GetSaleReport", {
    params: reportParams(params),
  });
  return { periods: data?.periods ?? [] };
}

/**
 * سطرهای خرید. عمداً فیلدِ سود ندارد — سود فقط سمتِ فروش معنا دارد
 * (بخش ۱۸)، و ساختنِ یک `netProfit` صفر اینجا فقط ستونِ گمراه‌کننده
 * تولید می‌کرد.
 */
export async function fetchPurchaseReport(params = {}) {
  const { data } = await axiosInstance.get("/Report/GetPurchaseReport", {
    params: reportParams(params),
  });
  return { periods: data?.periods ?? [] };
}

// ─── گزارشِ محدوده‌دار («من»، «تیم من»، «واحد من») ─────────────────────────

/**
 * `GET api/Report/GetScopePerformance` — درخواستِ بخشِ ۶ در
 * `Backend-Net/docs/frontend-requests.fa.md`.
 *
 * `scope` یکی از `ReportScopeEnum` است. سرور محدوده را از روی خودِ توکن
 * می‌سازد (تیم و واحدِ *فعلیِ* کاربر)، پس شناسه‌ی تیم یا واحد روی سیم
 * نمی‌رود و کسی نمی‌تواند با عوض‌کردنِ یک عدد گزارشِ تیمِ دیگری را ببیند.
 *
 * پاسخ: `{ scope, scopeName, periods: [...], members: [...] }` — برای
 * «من» فهرستِ `members` خالی است.
 */
export async function fetchScopePerformance(scope, params = {}) {
  const { data } = await axiosInstance.get("/Report/GetScopePerformance", {
    params: { scope, ...reportParams(params) },
  });
  return {
    scopeName: data?.scopeName ?? "",
    periods: data?.periods ?? [],
    members: data?.members ?? [],
  };
}

// ─── شمارشِ صف‌های کاری ─────────────────────────────────────────────────────

const QUEUE_ENDPOINTS = {
  sale: "/Sale/GetSaleList",
  purchase: "/Purchase/GetPurchaseList",
  saleReturn: "/SaleReturn/GetSaleReturnList",
  purchaseReturn: "/PurchaseReturn/GetPurchaseReturnList",
};

/**
 * تعدادِ سندهای یک وضعیت در یکی از چهار فهرست — `total`ِ فهرست با
 * `take=1`. سطرِ برگشتی دور ریخته می‌شود؛ فقط شمارنده لازم است.
 */
export async function fetchQueueCount(source, status) {
  const { data } = await axiosInstance.get(QUEUE_ENDPOINTS[source], {
    params: { page: 1, take: 1, status },
  });
  return normalizeListResponse(data).total ?? 0;
}
