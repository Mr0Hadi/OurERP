
import {
  allPurchases,
  PURCHASE_STATUSES,
  nextPurchaseItemId,
} from "./mockData";
import { adjustProductsStock } from "@/features/warehouse/products/services/api-mockData";
import { applyListQuery } from "@/shared/services/mockQuery";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * چقدر از یک قلم خرید تا این لحظه واقعاً وارد موجودیِ قابل‌فروش انبار
 * شده — یعنی مجموع دریافتی‌ها منهای بخشی که به‌عنوان «مشکل» (معیوب،
 * ارسال اشتباه، کسری و...) گزارش شده. این همان مقداری است که
 * confirmReceiving در ماژول دریافت انبار، دور به دور، به موجودی اضافه
 * کرده؛ پس برای برگرداندنِ درستِ موجودی هنگام «لغو» خرید لازم است.
 */
function computeHealthyReceivedQty(item) {
  const receivedQty = item.receivedQty || 0;
  const problematicQty = (item.issues || []).reduce(
    (sum, issue) => sum + (Number(issue.qty) || 0),
    0,
  );
  return Math.max(0, receivedQty - problematicQty);
}

/** شناسه‌دهی به اقلامِ تازه — قرینه‌ی سمت فروش. */
function withLineIds(items = []) {
  return items.map((item) => ({ ...item, id: item.id ?? nextPurchaseItemId() }));
}

function restorePurchaseStock(purchase) {
  adjustProductsStock(
    (purchase.items || [])
      .map((item) => ({
        productId: item.productId,
        delta: computeHealthyReceivedQty(item),
      }))
      .filter((entry) => entry.delta > 0),
  );
}

export async function createPurchase(purchaseData) {
  await delay(800);

  if (Math.random() < 0.05) {
    throw new Error("خطا در ثبت خرید");
  }

  const newId = allPurchases.length
    ? Math.max(...allPurchases.map((p) => Number(p.id) || 0)) + 1
    : 1;

  const newPurchase = {
    id: newId,
    ...purchaseData,
    items: withLineIds(purchaseData.items),
    // خرید تازه در مرحله‌ی «پیش‌فاکتور» است: تامین‌کننده هنوز فاکتور
    // رسمی نفرستاده، پس شماره‌ی فاکتور خالی می‌ماند. کاربر آن را وقتی
    // فاکتور رسید، همراه با تغییر وضعیت، خودش وارد می‌کند.
    status: PURCHASE_STATUSES.PROFORMA,
    invoiceNumber: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  allPurchases.unshift(newPurchase);
  return newPurchase;
}

export async function fetchPurchases(params = {}) {
  await delay(500);

  const { supplierIds = [], status = "", paymentType = "" } = params;

  let filtered = [...allPurchases];

  if (Array.isArray(supplierIds) && supplierIds.length > 0) {
    filtered = filtered.filter((p) =>
      supplierIds.map(String).includes(String(p.supplierId)),
    );
  }

  if (status !== "" && status !== undefined) {
    filtered = filtered.filter((p) => p.status === status);
  }

  if (paymentType !== "" && paymentType !== undefined) {
    filtered = filtered.filter((p) => p.paymentType === paymentType);
  }

  return applyListQuery(filtered, params, {
    searchFields: ["invoiceNumber", "supplierName", "description"],
    dateField: "invoiceDate",
    numericFields: ["totalAmount", "paidAmount"],
  });
}

export async function fetchPurchaseById(id) {
  await delay(300);

  const purchase = allPurchases.find((p) => Number(p.id) === Number(id));

  if (!purchase) {
    throw new Error("خرید یافت نشد");
  }

  return purchase;
}

/**
 * علاوه بر آپدیت معمولی خرید، اگر این آپدیت وضعیت را به «لغو شده»
 * تغییر دهد (و قبلاً لغو نشده بوده)، هر مقداری که تا این لحظه سالم
 * وارد موجودی شده بود از انبار کم می‌شود — چون خرید دیگر معتبر
 * نیست. چک وضعیت قبلی از کسر دوباره در فراخوانی‌های بعدی جلوگیری
 * می‌کند. حذف کامل رکورد (removePurchase) دیگر تأثیری روی موجودی
 * ندارد؛ فقط همین مسیر لغو است که موجودی را کم می‌کند.
 */
export async function updatePurchase(id, updates) {
  await delay(600);

  const index = allPurchases.findIndex((p) => Number(p.id) === Number(id));

  if (index === -1) {
    throw new Error("خرید یافت نشد");
  }

  const current = allPurchases[index];
  const isCancellingNow =
    updates.status === PURCHASE_STATUSES.CANCELLED &&
    current.status !== PURCHASE_STATUSES.CANCELLED;

  allPurchases[index] = {
    ...current,
    ...updates,
    ...(updates.items ? { items: withLineIds(updates.items) } : {}),
    updatedAt: new Date().toISOString(),
  };

  if (isCancellingNow) {
    restorePurchaseStock(allPurchases[index]);
  }

  return allPurchases[index];
}

export async function updatePurchaseStatus(id, newStatus) {
  return updatePurchase(id, { status: newStatus });
}


/**
 * حذف کامل رکورد خرید. این عملیات دیگر موجودی را تغییر نمی‌دهد —
 * کم‌کردنِ بخش سالمِ دریافت‌شده از موجودی فقط با «لغو» خرید
 * (updatePurchase/updatePurchaseStatus با status=cancelled) انجام
 * می‌شود، نه با حذف رکورد.
 */
export async function removePurchase(id) {
  await delay(600);

  const index = allPurchases.findIndex((p) => Number(p.id) === Number(id));

  if (index === -1) {
    throw new Error("خرید یافت نشد");
  }

  const removed = allPurchases.splice(index, 1)[0];
  return removed;
}

export async function updatePurchasePayment(id, paymentData) {
  await delay(600);

  const index = allPurchases.findIndex((p) => Number(p.id) === Number(id));

  if (index === -1) {
    throw new Error("خرید یافت نشد");
  }

  const currentPurchase = allPurchases[index];
  const newPaidAmount = currentPurchase.paidAmount + (paymentData.amount || 0);

  allPurchases[index] = {
    ...currentPurchase,
    paidAmount: newPaidAmount,
    updatedAt: new Date().toISOString(),
    ...paymentData,
  };

  return allPurchases[index];
}

/**
 * تغییر جمع کل خرید بدون دست‌زدن به هیچ قلمی.
 *
 * تنها راهی که ماژول مرجوعی خرید مبلغ سفارش را جابه‌جا می‌کند. عمداً
 * به هیچ قلمی دست نمی‌زند: یک اثر پولی (بازگشت وجه از تامین‌کننده، یا
 * پرداخت بابت کالای مازادی که نگه داشته‌ایم) فقط جمع کل را عوض می‌کند
 * و ربطی به «چقدر از سفارش رسیده» ندارد. مخلوط‌کردن این دو، محاسبه‌ی
 * «چقدر هنوز قابل دریافت است» را خراب می‌کرد.
 *
 * delta مثبت = بدهی ما به تامین‌کننده بیشتر می‌شود.
 */
export async function adjustPurchaseTotal(purchaseId, delta) {
  await delay(300);

  const index = allPurchases.findIndex(
    (p) => Number(p.id) === Number(purchaseId),
  );
  if (index === -1) {
    throw new Error("خرید یافت نشد");
  }

  if (!delta) return allPurchases[index];

  const purchase = allPurchases[index];
  allPurchases[index] = {
    ...purchase,
    totalAmount: Math.max(0, (purchase.totalAmount || 0) + delta),
    updatedAt: new Date().toISOString(),
  };

  return allPurchases[index];
}
