
import { allPurchases, PURCHASE_STATUSES } from "./mockData";
import { adjustProductsStock } from "@/features/warehouse/products/services/api-mockData";

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
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  allPurchases.unshift(newPurchase);
  return newPurchase;
}

export async function fetchPurchases(params = {}) {
  await delay(500);

  const {
    page = 1,
    limit = 10,
    search = "",
    supplierIds = [],
    status = "",
    paymentType = "",
    fromDate = "",
    toDate = "",
    sortBy = "createdAt",
    sortOrder = "desc",
  } = params;

  let filtered = [...allPurchases];

  if (search) {
    const searchLower = search.toLowerCase();
    filtered = filtered.filter(
      (p) =>
        p.invoiceNumber.toLowerCase().includes(searchLower) ||
        p.supplierName.toLowerCase().includes(searchLower) ||
        (p.description && p.description.toLowerCase().includes(searchLower)),
    );
  }

  if (Array.isArray(supplierIds) && supplierIds.length > 0) {
    filtered = filtered.filter((p) =>
      supplierIds.map(String).includes(String(p.supplierId)),
    );
  }

  if (status) {
    filtered = filtered.filter((p) => p.status === status);
  }

  if (paymentType) {
    filtered = filtered.filter((p) => p.paymentType === paymentType);
  }

  if (fromDate) {
    filtered = filtered.filter(
      (p) =>
        p.invoiceDate && p.invoiceDate.slice(0, 10) >= fromDate.slice(0, 10),
    );
  }
  if (toDate) {
    filtered = filtered.filter(
      (p) => p.invoiceDate && p.invoiceDate.slice(0, 10) <= toDate.slice(0, 10),
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

    if (sortOrder === "asc") {
      return aVal > bVal ? 1 : -1;
    }
    return aVal < bVal ? 1 : -1;
  });

  const total = filtered.length;
  const totalPages = Math.ceil(total / limit);
  const start = (page - 1) * limit;
  const end = start + limit;
  const items = filtered.slice(start, end);

  return { items, total, page, totalPages };
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

export async function deletePurchase(id) {
  return updatePurchaseStatus(id, PURCHASE_STATUSES.CANCELLED);
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
 * وقتی یک قلم با «بازگشت وجه»، «پذیرش زیان» یا «اعتبار خرید بعدی»
 * تسویه می‌شود، این تابع settledQty (تجمعی) را افزایش می‌دهد و در
 * صورت وجود مبلغ بازگشتی، از جمع کل خرید کم می‌کند.
 *
 * توجه: این تابع عمداً موجودی انبار را دست نمی‌زند — چون مقداری که
 * تسویه می‌شود همان مقداری‌ست که در confirmReceiving به‌عنوان «مشکل»
 * گزارش شده و از همان ابتدا هرگز وارد موجودیِ قابل‌فروش نشده بود؛ پس
 * چیزی برای کم‌کردن از موجودی وجود ندارد.
 *
 * همچنین وضعیت کلی خرید (status) را تغییر نمی‌دهد؛ تصمیم نهایی درباره‌ی
 * وضعیت خرید همیشه توسط recomputePurchaseStatus و با دیدن کل تصویر
 * گرفته می‌شود؛ این تابع را همیشه بلافاصله بعد از این تابع فراخوانی
 * کنید.
 */
export async function settlePurchaseItems(
  purchaseId,
  settledItems,
  { refundAmount = 0 } = {},
) {
  await delay(400);

  const index = allPurchases.findIndex(
    (p) => Number(p.id) === Number(purchaseId),
  );
  if (index === -1) {
    throw new Error("خرید یافت نشد");
  }

  const purchase = allPurchases[index];

  const updatedItems = purchase.items.map((item) => {
    const settle = settledItems.find((s) => s.productId === item.productId);
    if (!settle) return item;
    return {
      ...item,
      settledQty: (item.settledQty || 0) + (settle.qty || 0),
    };
  });

  allPurchases[index] = {
    ...purchase,
    items: updatedItems,
    totalAmount: Math.max(0, purchase.totalAmount - refundAmount),
    updatedAt: new Date().toISOString(),
  };

  return allPurchases[index];
}

/**
 * وقتی واحد خرید هماهنگ می‌کند که کالای جایگزین/کسری دوباره ارسال
 * شود، خرید باید دوباره در لیست دریافتِ انباردار ظاهر شود. status را
 * به‌عنوان یک بازخورد فوری روی SHIPPED می‌گذارد، اما مقدار نهایی و
 * قطعی همیشه توسط recomputePurchaseStatus (که بلافاصله بعد از این
 * تابع فراخوانی می‌شود) تعیین می‌شود.
 */
export async function reopenPurchaseForShipment(purchaseId) {
  await delay(300);

  const index = allPurchases.findIndex(
    (p) => Number(p.id) === Number(purchaseId),
  );
  if (index === -1) {
    throw new Error("خرید یافت نشد");
  }

  const purchase = allPurchases[index];

  if (purchase.status === PURCHASE_STATUSES.CANCELLED) {
    return purchase;
  }

  allPurchases[index] = {
    ...purchase,
    status: PURCHASE_STATUSES.SHIPPED,
    updatedAt: new Date().toISOString(),
  };

  return allPurchases[index];
}

/**
 * تنها و آخرین مرجع تصمیم‌گیری درباره‌ی وضعیت کلی یک خرید.
 *
 * این تابع باید بعد از هر تغییری که می‌تواند روی «آیا این خرید هنوز
 * چیزی برای دریافت در انبار دارد؟» اثر بگذارد فراخوانی شود — چه یک
 * دور دریافت واقعی، چه یک تسویه‌ی مالی، چه هماهنگی ارسال مجدد. چون
 * همیشه بر اساس *کل تصویر فعلی* (نه فقط آخرین اکشن) تصمیم می‌گیرد،
 * دیگر هیچ اکشنی نمی‌تواند نتیجه‌ی اکشن قبلی را نادیده بگیرد — حتی
 * وقتی چند نوع تصمیم مختلف (بازگشت وجه + جایگزینی) روی بخش‌های مختلف
 * یک خرید مخلوط شده باشند، یا چند دور کسری/مرجوعی پشت‌سرهم رخ داده
 * باشند.
 *
 * hasReceivableQty باید توسط فراخوان (معمولاً ماژول مرجوعی، با دیدن
 * هم آیتم‌های خرید و هم مرجوعی‌های فعال) محاسبه و پاس داده شود.
 */
export async function recomputePurchaseStatus(
  purchaseId,
  { hasReceivableQty = false } = {},
) {
  await delay(200);

  const index = allPurchases.findIndex(
    (p) => Number(p.id) === Number(purchaseId),
  );
  if (index === -1) {
    throw new Error("خرید یافت نشد");
  }

  const purchase = allPurchases[index];

  // وضعیت‌های نهاییِ غیرقابل‌بازگشت هیچ‌وقت توسط این تابع بازنویسی
  // نمی‌شوند
  if (purchase.status === PURCHASE_STATUSES.CANCELLED) {
    return purchase;
  }

  const fullyClosed = purchase.items.every(
    (item) => (item.receivedQty || 0) + (item.settledQty || 0) >= item.qty,
  );
  const anyReceived = purchase.items.some((item) => (item.receivedQty || 0) > 0);

  let newStatus;
  if (fullyClosed) {
    // همه‌ی اقلام یا فیزیکاً رسیده‌اند یا برای همیشه تسویه شده‌اند
    newStatus = PURCHASE_STATUSES.RECEIVED;
  } else if (hasReceivableQty) {
    // هنوز حداقل یک قلم چیزی «واقعاً قابل دریافت» دارد — چه به دلیل
    // این‌که هیچ مشکلی برایش گزارش نشده (در انتظار محموله‌ی بعدی)،
    // چه به دلیل این‌که یک تصمیم «ارسال جایگزین» برایش گرفته شده —
    // باید برای انباردار قابل مشاهده بماند
    newStatus = PURCHASE_STATUSES.SHIPPED;
  } else if (anyReceived) {
    // کسری باقی مانده ولی فعلاً هیچ‌چیز «قابل دریافت»ی نیست — یعنی
    // باقیمانده کاملاً حاصل مشکلات گزارش‌شده و هنوز تصمیم‌گیری‌نشده
    // است؛ باید از لیست دریافت خارج شود و منتظر تصمیم واحد خرید بماند
    newStatus = PURCHASE_STATUSES.PARTIALLY_RECEIVED;
  } else {
    newStatus =
      purchase.status === PURCHASE_STATUSES.PENDING
        ? PURCHASE_STATUSES.PENDING
        : PURCHASE_STATUSES.SHIPPED;
  }

  if (newStatus === purchase.status) {
    return purchase;
  }

  allPurchases[index] = {
    ...purchase,
    status: newStatus,
    updatedAt: new Date().toISOString(),
  };

  return allPurchases[index];
}