import {
  allSales,
  SALE_STATUSES,
  nextSaleItemId,
  nextSaleInvoiceNumber,
} from "./mockData";
import { isSaleProforma } from "@/shared/domain/enums/saleStatus";
import { adjustProductsStock } from "@/features/warehouse/products/services/api-mockData";
import { applyListQuery } from "@/shared/services/mockQuery";
import {
  allocateUnitsForSale,
  releaseUnitsForSale,
} from "@/features/warehouse/units/services/api-mockData";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * موجودی کالاهای یک فروش را به‌طور کامل برمی‌گرداند — دقیقاً معکوسِ
 * کاهشی که در createSale انجام شده (بر اساس quantity، نه shippedQuantity؛ چون
 * کاهش اولیه هم بدون توجه به وضعیت ارسال انجام شده بود).
 * این تابع فقط هنگام «لغو» فروش صدا زده می‌شود، نه هنگام حذف رکورد.
 */
/** شناسه‌دهی به اقلامِ تازه — اقلامی که از قبل شناسه دارند دست نمی‌خورند. */
function withLineIds(items = []) {
  return items.map((item) => ({ ...item, id: item.id ?? nextSaleItemId() }));
}

function restoreSaleStock(sale) {
  adjustProductsStock(
    (sale.items || []).map((item) => ({
      productId: item.productId,
      delta: item.quantity || 0,
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
    // هر قلم شناسه‌ی خودش را می‌گیرد؛ مرجوعی و انبار با همین شناسه به
    // خط فاکتور ارجاع می‌دهند، نه با productId.
    items: withLineIds(saleData.items),
    // فروش تازه فقط یک پیش‌فاکتور است؛ شماره‌ی فاکتور رسمی را بکند
    // موقعی می‌سازد که وضعیت از «پیش‌فاکتور» بیرون بیاید.
    status: SALE_STATUSES.PROFORMA,
    invoiceNumber: "",
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
      delta: -(item.quantity || 0),
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

  const { status = "", paymentType = "", customerId = "" } = params;

  let filtered = [...allSales];

  if (customerId !== "" && customerId != null) {
    filtered = filtered.filter(
      (s) => String(s.customerId) === String(customerId),
    );
  }

  if (status !== "" && status !== undefined) {
    filtered = filtered.filter((s) => s.status === status);
  }

  if (paymentType !== "" && paymentType !== undefined) {
    filtered = filtered.filter((s) => s.paymentType === paymentType);
  }

  return applyListQuery(filtered, params, {
    searchFields: ["invoiceNumber", "customerName", "description"],
    dateField: "invoiceDate",
    numericFields: ["totalAmount", "paidAmount"],
  });
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
  const nextStatus =
    updates.status === undefined ? current.status : updates.status;

  const isCancellingNow =
    nextStatus === SALE_STATUSES.CANCELLED &&
    current.status !== SALE_STATUSES.CANCELLED;

  // خروج از «پیش‌فاکتور» = تأیید مشتری. اینجا بکند فاکتور رسمی و
  // شماره‌اش را می‌سازد؛ ماک هم همان کار را می‌کند.
  const isLeavingProforma =
    isSaleProforma(current.status) && !isSaleProforma(nextStatus);

  allSales[index] = {
    ...current,
    ...updates,
    ...(updates.items ? { items: withLineIds(updates.items) } : {}),
    ...(isLeavingProforma && !current.invoiceNumber
      ? { invoiceNumber: nextSaleInvoiceNumber() }
      : {}),
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
/**
 * تغییر جمع کل فروش بدون دست‌زدن به هیچ قلمی — قرینه‌ی
 * adjustPurchaseTotal در سمت خرید.
 *
 * delta مثبت = طلب ما از مشتری بیشتر می‌شود (مثلاً کالای اضافه‌ای که
 * مشتری نگه داشته و پولش را می‌پردازد). delta منفی = بازگشت وجه به
 * مشتری.
 *
 * paidAmount عمداً دست نمی‌خورد: این تابع ارزشِ *فاکتور* را تغییر
 * می‌دهد، نه سابقه‌ی پرداخت‌ها را. ثبت خودِ پرداخت کار
 * updateSalePayment است.
 *
 * توجه: این‌که اثر مالیِ مرجوعی مستقیماً totalAmount را جابه‌جا کند —
 * به‌جای اینکه ردیف تعدیلِ صریح بسازد — یک بدهیِ آگاهانه است که با
 * سمت خرید مشترک است و باید یک‌جا برای هر دو حل شود. نگاه کنید به
 * NOTES.md ← «Invoice totals vs. return adjustments».
 */
export async function adjustSaleTotal(saleId, delta) {
  await delay(300);

  const index = allSales.findIndex((s) => Number(s.id) === Number(saleId));
  if (index === -1) throw new Error("فروش یافت نشد");

  if (!delta) return allSales[index];

  const sale = allSales[index];
  allSales[index] = {
    ...sale,
    totalAmount: Math.max(0, (sale.totalAmount || 0) + delta),
    updatedAt: new Date().toISOString(),
  };

  return allSales[index];
}
