import { allSales, SALE_STATUSES } from "./mockData";
import { adjustProductsStock } from "@/features/warehouse/products/services/api-mockData";
import {
  allocateUnitsForSale,
  releaseUnitsForSale,
} from "@/features/warehouse/units/services/api-mockData";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * موجودی کالاهای یک فروش را به‌طور کامل برمی‌گرداند — دقیقاً معکوسِ
 * کاهشی که در createSale انجام شده (بر اساس qty، نه shippedQty؛ چون
 * کاهش اولیه هم بدون توجه به وضعیت ارسال انجام شده بود).
 * این تابع فقط هنگام «لغو» فروش صدا زده می‌شود، نه هنگام حذف رکورد.
 */
function restoreSaleStock(sale) {
  adjustProductsStock(
    (sale.items || []).map((item) => ({
      productId: item.productId,
      delta: item.qty || 0,
    })),
  );
}

export async function createSale(saleData) {
  await delay(800);

  if (Math.random() < 0.05) {
    throw new Error("خطا در ثبت فروش");
  }

  const newSale = {
    id: Date.now(),
    ...saleData,
    // «در انتظار» و «در حال پردازش» یکی شده‌اند؛ هر فروش تازه با همین
    // یک وضعیت شروع می‌شود تا در لیست «ارسال کالا»ی انبار دیده شود.
    status: SALE_STATUSES.PROCESSING,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  allSales.unshift(newSale);

  // به‌محض ثبت فروش، موجودی کالا به‌اندازه‌ی مقدار فروخته‌شده کم
  // می‌شود؛ فارغ از اینکه هنوز از انبار ارسال شده باشد یا نه — چون از
  // همین لحظه این مقدار برای فروش‌های دیگر رزرو محسوب می‌شود.
  adjustProductsStock(
    (newSale.items || []).map((item) => ({
      productId: item.productId,
      delta: -(item.qty || 0),
    })),
  );

  // واحدهای برچسب‌خورده هم به همین فروش تخصیص می‌یابند (قدیمی‌ترین
  // اول). اگر کالایی هنوز واحد برچسب‌خورده نداشته باشد، چیزی تخصیص
  // نمی‌یابد و فقط موجودی عددی کم می‌شود — دفتر واحدها اختیاری است و
  // جریان فروش را مسدود نمی‌کند.
  allocateUnitsForSale(newSale.id, newSale.items || []);

  return newSale;
}

export async function fetchSales(params = {}) {
  await delay(500);

  const {
    page = 1,
    limit = 10,
    search = "",
    customerId = "",
    status = "",
    paymentType = "",
    fromDate = "",
    toDate = "",
    sortBy = "createdAt",
    sortOrder = "desc",
  } = params;

  let filtered = [...allSales];

  if (search) {
    const searchLower = search.toLowerCase();
    filtered = filtered.filter(
      (s) =>
        s.invoiceNumber.toLowerCase().includes(searchLower) ||
        s.customerName.toLowerCase().includes(searchLower) ||
        (s.description && s.description.toLowerCase().includes(searchLower)),
    );
  }

  if (params.customerIds && params.customerIds.length > 0) {
    filtered = filtered.filter((s) =>
      params.customerIds.includes(s.customerId),
    );
  }

  if (status) {
    filtered = filtered.filter((s) => s.status === status);
  }

  if (paymentType) {
    filtered = filtered.filter((s) => s.paymentType === paymentType);
  }

  if (fromDate) {
    filtered = filtered.filter(
      (s) =>
        s.invoiceDate && s.invoiceDate.slice(0, 10) >= fromDate.slice(0, 10),
    );
  }
  if (toDate) {
    filtered = filtered.filter(
      (s) => s.invoiceDate && s.invoiceDate.slice(0, 10) <= toDate.slice(0, 10),
    );
  }

  filtered.sort((a, b) => {
    let aVal = a[sortBy];
    let bVal = b[sortBy];

    if (sortBy === "createdAt" || sortBy === "updatedAt") {
      aVal = new Date(aVal).getTime();
      bVal = new Date(bVal).getTime();
    } else if (sortBy === "totalAmount" || sortBy === "paidAmount") {
      aVal = Number(aVal);
      bVal = Number(bVal);
    } else if (typeof aVal === "string") {
      return sortOrder === "asc"
        ? aVal.localeCompare(bVal, "fa")
        : bVal.localeCompare(aVal, "fa");
    }

    return sortOrder === "asc" ? (aVal > bVal ? 1 : -1) : aVal < bVal ? 1 : -1;
  });

  const total = filtered.length;
  const totalPages = Math.ceil(total / limit);
  const start = (page - 1) * limit;
  const items = filtered.slice(start, start + limit);

  return { items, total, page, totalPages };
}

export async function fetchSaleById(id) {
  await delay(300);

  const sale = allSales.find((s) => Number(s.id) === Number(id));
  if (!sale) throw new Error("فروش یافت نشد");
  return sale;
}

/**
 * علاوه بر آپدیت معمولی فروش، اگر این آپدیت وضعیت را به «لغو شده»
 * تغییر دهد (و قبلاً لغو نشده بوده)، موجودی کالاهای این فروش به‌طور
 * کامل به انبار برمی‌گردد. این نگهبان (چک وضعیت قبلی) از برگشت
 * دوباره‌ی موجودی در فراخوانی‌های بعدی جلوگیری می‌کند. حذف کامل رکورد
 * (removeSale) دیگر تأثیری روی موجودی ندارد؛ فقط همین مسیر لغو است
 * که موجودی را برمی‌گرداند.
 */
export async function updateSale(id, updates) {
  await delay(600);

  const index = allSales.findIndex((s) => Number(s.id) === Number(id));
  if (index === -1) throw new Error("فروش یافت نشد");

  const current = allSales[index];
  const isCancellingNow =
    updates.status === SALE_STATUSES.CANCELLED &&
    current.status !== SALE_STATUSES.CANCELLED;

  allSales[index] = {
    ...current,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  if (isCancellingNow) {
    restoreSaleStock(allSales[index]);
    releaseUnitsForSale(allSales[index].id);
  }

  return allSales[index];
}

export async function updateSaleStatus(id, newStatus) {
  return updateSale(id, { status: newStatus });
}

/**
 * حذف کامل رکورد فروش. این عملیات دیگر موجودی را تغییر نمی‌دهد —
 * برگرداندن موجودی فقط با «لغو» فروش (updateSale/updateSaleStatus با
 * status=cancelled) انجام می‌شود، نه با حذف رکورد.
 */
export async function removeSale(id) {
  await delay(600);

  const index = allSales.findIndex((p) => p.id == id);

  if (index === -1) {
    throw new Error("خرید یافت نشد");
  }

  const removed = allSales.splice(index, 1)[0];
  return removed;
}

export async function deleteSale(id) {
  return updateSaleStatus(id, SALE_STATUSES.CANCELLED);
}

export async function updateSalePayment(id, paymentData) {
  await delay(600);

  const index = allSales.findIndex((s) => Number(s.id) === Number(id));
  if (index === -1) throw new Error("فروش یافت نشد");

  const current = allSales[index];
  allSales[index] = {
    ...current,
    paidAmount: (Number(current.paidAmount) || 0) + (paymentData.amount || 0),
    updatedAt: new Date().toISOString(),
    ...paymentData,
  };

  return allSales[index];
}