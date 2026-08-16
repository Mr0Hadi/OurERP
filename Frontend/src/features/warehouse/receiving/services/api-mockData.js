import {
  allPurchases,
  PURCHASE_STATUSES,
  PURCHASE_STATUS_LABELS,
} from "./mockData";
import {
  autoResolveReplacementReturns,
  computeItemReceivableQty,
} from "@/features/purchases/returns/services/api-mockData";
import { adjustProductsStock } from "@/features/warehouse/products/services/api-mockData";
import { SURPLUS_KINDS } from "@/shared/constants/purchaseIssueTypes";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const generateId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export const RECEIVING_ELIGIBLE_STATUSES = [PURCHASE_STATUSES.SHIPPED];

export const RECEIVING_STATUS_LABELS = Object.fromEntries(
  Object.entries(PURCHASE_STATUS_LABELS).filter(([key]) =>
    RECEIVING_ELIGIBLE_STATUSES.includes(key),
  ),
);

export async function fetchReceivingPurchases(params = {}) {
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

  let filtered = allPurchases.filter((p) =>
    RECEIVING_ELIGIBLE_STATUSES.includes(p.status),
  );

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
    filtered = filtered.filter((p) => supplierIds.includes(p.supplierId));
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

    if (
      sortBy === "createdAt" ||
      sortBy === "updatedAt" ||
      sortBy === "invoiceDate"
    ) {
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

/**
 * علاوه بر برگرداندن خودِ خرید، هر قلم را با receivableQty (محاسبه‌ی
 * دقیق و تازه‌ی «الان واقعاً چقدر قابل دریافت است»، با در نظر گرفتن
 * مشکلات گزارش‌شده‌ی حل‌نشده و مرجوعی‌های فعال) enrich می‌کند. فرم
 * دریافت باید فقط از همین مقدار استفاده کند، نه محاسبه‌ی محلیِ ساده.
 */
export async function fetchReceivingPurchaseById(id) {
  await delay(300);

  const purchase = allPurchases.find((p) => p.id === id);

  if (!purchase) {
    throw new Error("خرید یافت نشد");
  }

  return {
    ...purchase,
    items: purchase.items.map((item) => ({
      ...item,
      receivableQty: computeItemReceivableQty(item, purchase.id),
    })),
  };
}

export async function updateReceivingStatus(id, receivedItems) {
  await delay(600);

  const index = allPurchases.findIndex((p) => p.id === id);

  if (index === -1) {
    throw new Error("خرید یافت نشد");
  }

  const originalPurchase = allPurchases[index];
  const allItemsReceived = receivedItems.every(
    (item) => item.receivedQty >= item.orderedQty,
  );
  const anyItemReceived = receivedItems.some((item) => item.receivedQty > 0);
  const noItemReceived = receivedItems.every((item) => item.receivedQty === 0);

  let newStatus;
  if (noItemReceived) {
    newStatus = PURCHASE_STATUSES.SHIPPED;
  } else if (allItemsReceived) {
    newStatus = PURCHASE_STATUSES.RECEIVED;
  } else if (anyItemReceived) {
    newStatus = PURCHASE_STATUSES.PARTIALLY_RECEIVED;
  } else {
    newStatus = originalPurchase.status;
  }

  allPurchases[index] = {
    ...originalPurchase,
    status: newStatus,
    items: originalPurchase.items.map((item) => {
      const receivedItem = receivedItems.find(
        (ri) => ri.productId === item.productId,
      );
      return receivedItem
        ? { ...item, receivedQty: receivedItem.receivedQty }
        : item;
    }),
    updatedAt: new Date().toISOString(),
  };

  return allPurchases[index];
}

/**
 * ثبت نهایی یک «دور دریافت» در انبار.
 *
 * ۱. مقدار دریافتی هر قلم تجمعی است — همین به‌طور طبیعی از دریافت‌های
 *    چندمرحله‌ای/چند-ماشینه پشتیبانی می‌کند.
 * ۲. اگر قلمی در این دور همچنان کسری داشته باشد، انباردار می‌تواند
 *    فقط بخشی از آن را به‌عنوان «مشکل واقعی» (نه صرفاً دیرکرد ارسال)
 *    گزارش کند؛ باقیمانده‌ی گزارش‌نشده به‌طور خودکار «در انتظار
 *    محموله بعدی» تلقی می‌شود و هیچ اثری روی وضعیت خرید نمی‌گذارد
 *    (خرید همچنان SHIPPED و در لیست دریافت می‌ماند).
 * ۳. وضعیت نهاییِ خرید هرگز اینجا حدس زده نمی‌شود؛ کاملاً به
 *    autoResolveReplacementReturns سپرده می‌شود که با دیدن تصویر
 *    کامل (این خرید + تمام مرجوعی‌های فعالش) آن را قطعی می‌کند.
 * ۴. موجودی انبار دقیقاً به‌اندازه‌ی receivedQty همین دور افزایش
 *    می‌یابد. برخلاف «بررسی و دریافت مرجوعی فروش» — که در آن issues
 *    زیرمجموعه‌ی خودِ مقدار بررسی‌شده است و باید کم شود — اینجا سقف
 *    هر issue برابر کسری (expectedQty − receivedQty) است، یعنی issues
 *    همیشه *بیرون* از receivedQty قرار دارد: کالای معیوب/آسیب‌دیده/
 *    ارسال‌اشتباه اساساً در تعداد دریافتی شمرده نمی‌شود. پس کم‌کردن
 *    دوباره‌ی آن، مقدار سالمِ رسیده را کمتر از واقع ثبت می‌کرد.
 * ۵. «مازاد» — کالای اضافه‌ی یک قلم شناخته‌شده و کالای کاملاً
 *    ثبت‌نشده — در purchase.surplusItems می‌نشیند، *نه* در
 *    items[].issues و نه در receivedQty. دلیلش در SURPLUS_KINDS
 *    توضیح داده شده: مازاد بیرون از سقف سفارش است و نباید در هیچ
 *    محاسبه‌ای که به qty/receivedQty/settledQty وابسته است شرکت کند.
 *    آرایه روی خودِ خرید است نه روی قلم، چون کالای ثبت‌نشده اصلاً
 *    قلمی برای نشستن ندارد.
 * ۶. مازاد وارد موجودی قابل‌فروش نمی‌شود. کالا فیزیکاً در انبار هست
 *    ولی هنوز مال ما نیست؛ فقط با تصمیم «نگهداری» واحد خرید به
 *    موجودی اضافه می‌شود.
 * ۷. یک قلم می‌تواند هم‌زمان کسری و مازاد داشته باشد (سفارش ۲۰،
 *    رسیده ۲۵ که ۱۰تایش خراب است: ۱۵ سالم تحویل‌شده یعنی ۵ کسری،
 *    به‌علاوه ۵ عدد بیشتر از سفارش). چون این دو در دو ساختار جدا
 *    می‌نشینند، هیچ‌کدام سقف دیگری را مصرف نمی‌کند.
 */
export async function confirmReceiving(purchaseId, receivingData) {
  await delay(500);

  const index = allPurchases.findIndex((p) => p.id === purchaseId);
  if (index === -1) throw new Error("خرید یافت نشد");

  const purchase = allPurchases[index];
  const receivedDate =
    receivingData.receivedDate || new Date().toISOString().slice(0, 10);

  const stockIncreases = [];
  const newSurplusItems = [];

  const updatedItems = purchase.items.map((item) => {
    const receivedItem = receivingData.receivedItems.find(
      (ri) => ri.productId === item.productId,
    );
    if (!receivedItem) return item;

    const prevReceived = item.receivedQty || 0;
    const thisRoundQty = receivedItem.receivedQty || 0;
    const newReceivedQty = prevReceived + thisRoundQty;

    // فقط مقداری که انباردار صراحتاً به‌عنوان «مشکل» علامت زده به
    // تاریخچه‌ی issues اضافه می‌شود؛ باقیِ کسری (اگر انباردار چیزی
    // برایش گزارش نکرده) هیچ اثری در داده نمی‌گذارد و صرفاً به این
    // معناست که هنوز نرسیده — دور بعدی دوباره جزو «قابل دریافت»
    // محاسبه خواهد شد.
    const reportedIssues = (receivedItem.issues || []).filter(
      (b) => (Number(b.qty) || 0) > 0,
    );
    const appended = reportedIssues.map((b) => ({
      id: generateId(),
      type: b.type || "shortage",
      qty: Number(b.qty) || 0,
      note: b.note || "",
      date: receivedDate,
    }));

    // هرچه انباردار در این دور «دریافت‌شده» شمرده، سالم و قابل‌فروش
    // است و مستقیماً به موجودی اضافه می‌شود. مشکلات گزارش‌شده ادعایی
    // روی سفارش‌اند (چیزی که نرسید یا سالم تحویل داده نشد)، نه بخشی
    // از همین تعداد — بنابراین از آن کم نمی‌شوند.
    if (thisRoundQty > 0) {
      stockIncreases.push({ productId: item.productId, delta: thisRoundQty });
    }

    // مازادِ همین قلم: قیمت واحد از خودِ قلم سفارش برداشته می‌شود، پس
    // فرم لازم نیست آن را حمل کند — اگر بعداً تصمیم «نگهداری و تسویه»
    // گرفته شود، مبلغی که باید پرداخت شود از همین‌جا می‌آید.
    const excessQty = Number(receivedItem.excessQty) || 0;
    if (excessQty > 0) {
      newSurplusItems.push({
        id: generateId(),
        kind: SURPLUS_KINDS.EXCESS,
        productId: item.productId,
        productCode: item.productCode,
        productName: item.productName,
        unit: item.unit,
        qty: excessQty,
        unitPrice: item.unitPrice || 0,
        note: receivedItem.excessNote || "",
        date: receivedDate,
      });
    }

    return {
      ...item,
      receivedQty: newReceivedQty,
      issues: appended.length > 0 ? [...(item.issues || []), ...appended] : item.issues,
    };
  });

  // کالای ثبت‌نشده به هیچ قلمی وصل نیست: نه productId دارد نه
  // productCode، و قیمتش صفر است چون هیچ‌کس هنوز قیمتی برایش توافق
  // نکرده. اتصال به یک کالای واقعی تا لحظه‌ی تصمیمِ «نگهداری» به
  // تعویق می‌افتد.
  (receivingData.unknownItems || []).forEach((row) => {
    const qty = Number(row.qty) || 0;
    if (qty <= 0 || !row.productName?.trim()) return;
    newSurplusItems.push({
      id: generateId(),
      kind: SURPLUS_KINDS.UNKNOWN,
      productId: null,
      productCode: null,
      productName: row.productName.trim(),
      unit: row.unit || "عدد",
      qty,
      unitPrice: 0,
      note: row.note || "",
      date: receivedDate,
    });
  });

  allPurchases[index] = {
    ...purchase,
    items: updatedItems,
    // مازاد تجمعی است، مثل issues: هر دور دریافت فقط به آن اضافه
    // می‌کند و هیچ‌وقت بازنویسی‌اش نمی‌کند.
    surplusItems:
      newSurplusItems.length > 0
        ? [...(purchase.surplusItems || []), ...newSurplusItems]
        : purchase.surplusItems,
    // status اینجا عمداً دست‌نخورده باقی می‌ماند (هنوز shipped)؛ چند
    // خط پایین‌تر با autoResolveReplacementReturns به‌طور قطعی تعیین
    // می‌شود.
    receivedItems: receivingData.receivedItems,
    receivingNote: receivingData.receivingNote,
    receivedDate,
    transporterName: receivingData.transporterName || "",
    transporterNationalId: receivingData.transporterNationalId || "",
    vehiclePlate: receivingData.vehiclePlate || "",
    updatedAt: new Date().toISOString(),
  };

  adjustProductsStock(stockIncreases);

  await autoResolveReplacementReturns(purchaseId);

  const finalIndex = allPurchases.findIndex((p) => p.id === purchaseId);
  return allPurchases[finalIndex];
}