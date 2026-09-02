// src/features/reports/services/api-mockData.js
import { allSales } from "@/features/sales/orders/services/mockData";
import { allPurchases } from "@/features/purchases/orders/services/mockData";
import { allEmployees } from "@/features/employees/services/mockData";
import { applyListQuery } from "@/shared/services/mockQuery";

/**
 * نسخه‌ی mockِ چهار گزارشِ فعالیتِ `api/Report`.
 *
 * سطحش مو‌به‌مو همان `api-v1` است — همان چهار تابع، همان آرگومان‌ها و
 * همان *نام‌های فیلدِ سرور* (`fullName`، `salesCount`،
 * `totalInvoiceAmount`، …). هر «بهبودِ» کوچکی در شکلِ خروجیِ mock روزِ
 * مهاجرت به یک باگِ خاموش تبدیل می‌شود.
 *
 * محاسبه همان کاری است که `ReportController` می‌کند: گروه‌بندی روی
 * سند، جمعِ مبلغ و تعداد، مرتب‌سازیِ نزولی بر اساس مبلغ کل، و فیلترِ
 * بازه روی **تاریخ فاکتور**.
 *
 * ⚠️ یک تفاوتِ عمدی: سندهای mock فیلدِ `salesUserId`/`purchasingUserId`
 * ندارند (بکند این دو را از کاربرِ واردشده پر می‌کند و mock کاربری
 * ندارد). برای اینکه صفحه‌ی «عملکرد کارمندان» روی داده‌ی ساختگی هم چیزی
 * برای نشان‌دادن داشته باشد، اگر سند این فیلد را نداشت یک کارمند
 * به‌صورت *قطعی* (نه تصادفی) از روی id سند به آن نسبت داده می‌شود؛ پس
 * خروجی بین دو بار فراخوانی عوض نمی‌شود. روزِ اتصال به سرور، این فایل
 * کنار می‌رود و هیچ‌کدام از این‌ها باقی نمی‌ماند.
 */

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** فقط کارمندانی که واقعاً کاربرِ سیستم‌اند می‌توانند سند بزنند. */
const employees = allEmployees;

const employeeName = (id) => {
  const employee = employees.find((item) => Number(item.id) === Number(id));
  return employee ? `${employee.firstName} ${employee.lastName}`.trim() : `کاربر ${id}`;
};

/** جانشینِ قطعیِ `salesUserId`/`purchasingUserId` — توضیحش بالای فایل. */
const fallbackUserId = (documentId) =>
  employees.length ? employees[(Number(documentId) || 0) % employees.length].id : null;

/**
 * موتورِ مشترکِ هر چهار گزارش: گروه‌بندی + جمع + مرتب‌سازی + صفحه‌بندی.
 *
 * `applyListQuery` همان مسیرِ صفحه‌بندیِ بقیه‌ی mockهاست تا شکلِ خروجی
 * (`{ items, total, page, totalPages }`) با `normalizeListResponse`ِ
 * سمتِ سرور یکی بماند.
 */
function rank(documents, params, { keyOf, rowOf, countField }) {
  const { fromDate = "", toDate = "" } = params;

  const inRange = documents.filter((doc) => {
    const date = String(doc.invoiceDate ?? "").slice(0, 10);
    if (!date) return false;
    if (fromDate && date < fromDate.slice(0, 10)) return false;
    if (toDate && date > toDate.slice(0, 10)) return false;
    return true;
  });

  const groups = new Map();

  for (const doc of inRange) {
    const key = keyOf(doc);
    if (key == null) continue;

    const current = groups.get(key) ?? {
      ...rowOf(doc, key),
      [countField]: 0,
      totalInvoiceAmount: 0,
      totalPaidAmount: 0,
    };

    current[countField] += 1;
    current.totalInvoiceAmount += Number(doc.totalAmount) || 0;
    current.totalPaidAmount += Number(doc.paidAmount) || 0;
    groups.set(key, current);
  }

  // فقط صفحه‌بندی و مرتب‌سازی از `applyListQuery` خواسته می‌شود.
  // `fromDate`/`toDate` عمداً پاس داده *نمی‌شوند*: بازه بالا روی خودِ
  // سندها اعمال شد، و اگر دوباره اینجا بیایند روی *ردیف‌های گروه‌شده*
  // اعمال می‌شوند که اصلاً فیلد تاریخ ندارند — نتیجه‌اش جدولِ همیشه‌خالی
  // است.
  return applyListQuery(
    [...groups.values()],
    { page: params.page, limit: params.limit, sortBy: "totalInvoiceAmount", sortOrder: "desc" },
    { numericFields: ["totalInvoiceAmount", "totalPaidAmount", countField] },
  );
}

/**
 * دو گزارشِ کارمندان فیلدِ `totalPaidAmount` ندارند
 * (`SalesPerformanceByEmployeeDto`/`SupplyPerformanceByEmployeeDto`)؛
 * موتورِ مشترکِ بالا آن را حساب می‌کند، پس اینجا حذف می‌شود تا شکلِ mock
 * دقیقاً همان شکلِ سرور بماند.
 */
function withoutPaidAmount(result) {
  return {
    ...result,
    items: result.items.map((row) => {
      const next = { ...row };
      delete next.totalPaidAmount;
      return next;
    }),
  };
}

export async function fetchSalesPerformanceByEmployee(params = {}) {
  await delay(400);

  const result = rank(allSales, params, {
    keyOf: (sale) => sale.salesUserId ?? fallbackUserId(sale.id),
    rowOf: (sale, key) => ({ userId: key, fullName: employeeName(key) }),
    countField: "salesCount",
  });

  // سرور روی این گزارش `totalPaidAmount` نمی‌دهد؛ mock هم نباید بدهد.
  return withoutPaidAmount(result);
}

export async function fetchSupplyPerformanceByEmployee(params = {}) {
  await delay(400);

  const result = rank(allPurchases, params, {
    keyOf: (purchase) => purchase.purchasingUserId ?? fallbackUserId(purchase.id),
    rowOf: (purchase, key) => ({ userId: key, fullName: employeeName(key) }),
    countField: "purchasesCount",
  });

  return withoutPaidAmount(result);
}

export async function fetchCustomerPurchaseStatistics(params = {}) {
  await delay(400);

  return rank(allSales, params, {
    keyOf: (sale) => sale.customerId,
    rowOf: (sale) => ({ customerId: sale.customerId, fullName: sale.customerName }),
    countField: "salesCount",
  });
}

export async function fetchSupplierSalesStatistics(params = {}) {
  await delay(400);

  return rank(allPurchases, params, {
    keyOf: (purchase) => purchase.supplierId,
    rowOf: (purchase) => ({
      supplierId: purchase.supplierId,
      companyName: purchase.supplierName,
    }),
    countField: "purchasesCount",
  });
}
