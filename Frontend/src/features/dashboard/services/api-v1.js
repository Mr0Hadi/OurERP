// src/features/dashboard/services/api-v1.js
import axiosInstance from "@/shared/services/api/axios";
import { DEFAULT_REPORT_PERIOD } from "@/shared/domain/enums/reportPeriod";

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
