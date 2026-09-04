import { allPurchases } from "./mockData";
import { PURCHASE_STATUSES } from "@/features/purchases/orders/services/constants";
import { adjustProductsStock } from "@/features/warehouse/products/services/api-mockData";
import { applyListQuery } from "@/shared/services/mockQuery";
import { runOnce } from "@/shared/services/mockIdempotency";

import { allSalesReturns } from "@/features/sales/returns/services/mockData";
import { executeGoodsRound as executeSalesReturnRound } from "@/features/sales/returns/services/api-mockData";
import { allPurchaseReturns } from "@/features/purchases/returns/services/mockData";
import {
  executeGoodsRound as executePurchaseReturnRound,
  createPurchaseReturn,
} from "@/features/purchases/returns/services/api-mockData";
import {
  CLAIM_SCOPES,
  OFF_ORDER_KINDS,
  PURCHASE_RETURN_PROBLEMS,
} from "@/features/purchases/returns/domain/purchaseReturnVocabulary";
import {
  buildGoodsLines,
  hasPendingGoodsIn,
} from "@/shared/domain/returns/resolutions";
import { EFFECT_KINDS } from "@/shared/domain/returns/effects";

import {
  DEFAULT_RECEIVING_ISSUE_TYPE,
  INCOMING_TYPES,
  RECEIVING_ELIGIBLE_STATUSES,
  RECEIVING_SOURCES,
  SURPLUS_KINDS,
} from "../domain/receivingVocabulary";

/**
 * کلِ APIِ دریافت انبار — نسخه‌ی mock.
 *
 * سه فایل بود (api-mockData / incomingQueueApi / returnsIntakeApi) و
 * queries و mutations از هر سه import می‌کردند. یعنی درزِ تعویضِ بکند
 * سه‌تکه بود و api-v1 فقط یک‌سومش را می‌پوشاند. حالا یک ماژول است با
 * یک سطحِ مشخص، و api-v1 دقیقاً همان سطح را دارد.
 *
 * چیزی که *بیرون* می‌رود فقط چهار تابع است. باقی، محاسبه‌ی داخلیِ
 * mock است — روز مهاجرت اینها را سرور انجام می‌دهد و اصلاً وجود
 * نخواهند داشت.
 */

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const generateId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

// ─── محاسبات داخلی ──────────────────────────────────────────────────────────

function reportedIssuesQuantity(item) {
  return (item.issues || []).reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);
}

/**
 * چقدر از یک قلم خرید هنوز «در راه» است.
 *
 * سه دسته‌ی جدا داریم و فقط یکی‌شان قابل دریافت است:
 *   • رسیده           → receivedQuantity
 *   • مشکل‌دار گزارش‌شده → issues (کسری، معیوب، اشتباه، ...)
 *   • هیچ‌کدام         → هنوز نرسیده، منتظر محموله‌ی بعدی
 *
 * دسته‌ی دوم عمداً کم می‌شود. تا پیش از این نمی‌شد و نتیجه‌اش این بود
 * که کالای معیوبی که انباردار گزارشش کرده بود، کنار کالایی که واقعاً
 * هنوز نرسیده در فهرست «قابل دریافت» می‌ماند و انباردار راهی نداشت
 * این دو را از هم تشخیص دهد.
 *
 * مقدارِ مشکل‌دار از مسیر خودش برمی‌گردد نه از اینجا: روی گزارش انبار
 * یک مرجوعی باز می‌شود و اگر تصمیمش «ارسال کالای جایگزین» باشد، همان
 * مقدار به‌عنوان خطِ مرجوعی در بخش «اقلام مرجوعی» همین صفحه ظاهر
 * می‌شود. اگر تصمیم «بازگشت وجه» باشد، اصلاً نباید برگردد.
 */
function computeItemReceivableQuantity(item) {
  return Math.max(
    0,
    (Number(item.quantity) || 0) -
      (Number(item.receivedQuantity) || 0) -
      reportedIssuesQuantity(item),
  );
}

/**
 * خطوطِ مرجوعیِ یک خرید: اثرهای GOODS_INِ معلق در همه‌ی مرجوعی‌های آن.
 *
 * تامین‌کننده‌ای که خرید را چند سری می‌فرستد، جایگزین‌های مرجوعیِ سری
 * قبل را معمولاً با سریِ بعد می‌فرستد — یک ماشین، یک رسید.
 */
function pendingReturnLinesForPurchase(purchaseId) {
  const lines = [];
  allPurchaseReturns.forEach((ret) => {
    if (Number(ret.purchaseId) !== Number(purchaseId)) return;
    buildGoodsLines(ret, EFFECT_KINDS.GOODS_IN).forEach((line) => {
      if (line.remainingQuantity <= 0) return;
      lines.push({ ...line, returnId: ret.id, returnNumber: ret.returnNumber });
    });
  });
  return lines;
}

/**
 * وضعیت خرید بعد از یک دور دریافت.
 *
 * تا امروز هیچ‌کس این را حساب نمی‌کرد: confirmReceiving وضعیت را دست
 * نمی‌زد و تابعی که قرار بود این کار را بکند در بازنویسی مدلِ مرجوعی
 * بی‌استفاده مانده و حذف شده بود. نتیجه این بود که خرید برای همیشه
 * SHIPPED می‌ماند و هرگز از صف دریافت بیرون نمی‌رفت — حتی وقتی کامل
 * تحویل گرفته شده بود.
 *
 * معیار، «آیا هنوز چیزی در راه است؟» است، نه «آیا کم داریم؟»:
 * مقدارِ مشکل‌دار کم هست ولی در راه نیست، پس خرید را در صف نگه
 * نمی‌دارد. اگر بعداً تصمیمِ مرجوعی «کالای جایگزین» باشد، خرید از
 * مسیر returnLines دوباره به صف برمی‌گردد.
 */
function nextPurchaseStatus(purchase, items) {
  if (purchase.status === PURCHASE_STATUSES.CANCELLED) return purchase.status;

  const stillInTransit = items.some((item) => computeItemReceivableQuantity(item) > 0);
  if (stillInTransit) return PURCHASE_STATUSES.SHIPPED;

  const fullyReceived = items.every(
    (item) => (item.receivedQuantity || 0) >= (item.quantity || 0),
  );
  return fullyReceived
    ? PURCHASE_STATUSES.RECEIVED
    : PURCHASE_STATUSES.PARTIALLY_RECEIVED;
}

/**
 * یک خرید تا وقتی در صف دریافت می‌ماند که یا هنوز چیزی از خودِ سفارش
 * نرسیده باشد، یا تامین‌کننده بابت مرجوعی‌های آن کالای جایگزینی
 * بدهکار باشد.
 *
 * شرط دوم عمدی است: اگر خرید پس از دریافت کاملِ سفارش از صف بیرون
 * می‌رفت، انباردار جایی برای ثبت محموله‌ی جایگزین نداشت.
 */
function isPurchaseAwaitingIntake(purchase) {
  return (
    RECEIVING_ELIGIBLE_STATUSES.includes(purchase.status) ||
    pendingReturnLinesForPurchase(purchase.id).length > 0
  );
}

/**
 * «تعداد اقلام» در صف انبار یعنی *چند خط هنوز کارِ انبار دارد* — نه
 * چند خط روی سند است.
 *
 * پیش از این، تعدادِ کلِ اقلامِ سند شمرده می‌شد. نتیجه‌اش این بود که
 * بعد از یک دور دریافتِ ناقص، صف همچنان همان عدد اول را نشان می‌داد
 * در حالی که صفحه‌ی جزئیات فقط خطوطِ باز را می‌آورد: انباردار در لیست
 * ۴ قلم می‌دید و با باز کردنش ۲ قلم. همین عدد ملاکِ اولویت‌بندیِ کار
 * است، پس باید همان چیزی باشد که پشتِ در است.
 *
 * خطِ «باز» دو منبع دارد و هر دو شمرده می‌شوند: باقیمانده‌ی خودِ سفارش،
 * و کالای جایگزینی که بابت مرجوعی‌ها بدهکاریم.
 */
function purchaseToRow(purchase) {
  const returnLines = pendingReturnLinesForPurchase(purchase.id);
  const openItems = (purchase.items || []).filter(
    (item) => computeItemReceivableQuantity(item) > 0,
  );

  return {
    id: purchase.id,
    type: INCOMING_TYPES.PURCHASE,
    refNumber: purchase.invoiceNumber,
    counterpartyId: purchase.supplierId,
    counterpartyType: "supplier",
    counterpartyName: purchase.supplierName,
    date: purchase.invoiceDate,
    itemsCount: openItems.length + returnLines.length,
    returnLinesCount: returnLines.length,
    // تعدادِ واقعیِ کالایی که هنوز باید برسد — «۲ قلم» می‌تواند ۳ عدد
    // باشد یا ۳۰۰ عدد، و انباردار برای برنامه‌ریزی به این عدد هم نیاز
    // دارد. قرینه‌ی همان ستونی که صف ارسال از قبل داشت.
    remainingQuantity:
      openItems.reduce((sum, item) => sum + computeItemReceivableQuantity(item), 0) +
      returnLines.reduce((sum, line) => sum + line.remainingQuantity, 0),
    amount: purchase.totalAmount,
    createdAt: purchase.createdAt,
    updatedAt: purchase.updatedAt,
  };
}

/** همان تعریفِ purchaseToRow، روی خطوطِ مرجوعی. */
function salesReturnToRow(salesReturn) {
  const openLines = buildGoodsLines(salesReturn, EFFECT_KINDS.GOODS_IN).filter(
    (line) => line.remainingQuantity > 0,
  );

  return {
    id: salesReturn.id,
    type: INCOMING_TYPES.SALES_RETURN,
    refNumber: salesReturn.returnNumber,
    counterpartyId: salesReturn.customerId,
    counterpartyType: "customer",
    counterpartyName: salesReturn.customerName,
    date: salesReturn.returnDate,
    itemsCount: openLines.length,
    returnLinesCount: openLines.length,
    remainingQuantity: openLines.reduce((sum, line) => sum + line.remainingQuantity, 0),
    amount: salesReturn.totalClaimedAmount,
    createdAt: salesReturn.createdAt,
    updatedAt: salesReturn.updatedAt,
  };
}

/**
 * ردیف‌های فرم را به «دورِ اجرای اثر» ترجمه می‌کند و به موتور اثرِ
 * مرجوعی می‌سپارد، گروه‌بندی‌شده بر اساس مرجوعی تا هر کدام یک بار
 * به‌روز شود.
 *
 * «سالم» همان تعدادی است که مشکلی برایش گزارش نشده — همان قاعده‌ای که
 * برای خطوط سفارش هم به کار می‌رود، نه فیلدی جدا که انباردار دوباره
 * پرش کند. به همین دلیل اینجا فقط *مشاهده‌ها* فرستاده می‌شوند و
 * موتور اثر خودش مقدار سالم را حساب می‌کند.
 *
 * ردیف‌های مشکل با نوع و تعدادِ خودشان منتقل می‌شوند، نه فشرده‌شده در
 * یک یادداشت: انباردار می‌تواند از یک محموله بگوید «۲ تا معیوب، ۱ تا
 * آسیب حمل» و این تفکیک تنها چیزی است که گزارشِ مقصر را ممکن می‌کند.
 */
async function applyReturnRows(rows, logistics, executeRound, fallbackReturnId) {
  const byReturn = new Map();

  rows.forEach((row) => {
    const quantity = Number(row.receivedQuantity) || 0;
    if (quantity <= 0) return;
    const entry = {
      effectId: row.effectId,
      quantity,
      observations: (row.issues || []).map((issue) => ({
        problem: issue.type,
        quantity: Number(issue.quantity) || 0,
        note: issue.note || "",
      })),
    };
    // در رسیدِ خرید، هر خط مرجوعیِ خودش را می‌شناسد (چون یک رسید
    // می‌تواند جایگزینِ چند مرجوعی را با هم بیاورد). در صفحه‌ی
    // اختصاصیِ یک مرجوعی، همه‌ی خطوط مالِ همان مرجوعی‌اند.
    const returnId = row.returnId ?? fallbackReturnId;
    if (!byReturn.has(returnId)) byReturn.set(returnId, []);
    byReturn.get(returnId).push(entry);
  });

  let last = null;
  for (const [returnId, rounds] of byReturn) {
    last = await executeRound(returnId, { rounds, ...logistics });
  }
  return last;
}

// ─── سطحِ عمومی ─────────────────────────────────────────────────────────────

/**
 * صف یکپارچه‌ی «چیزهایی که باید به انبار برسند»: خریدهای در انتظار
 * دریافت، و مرجوعی‌های فروش که تصمیمِ پس‌گرفتن کالا دارند.
 *
 * مرجوعی بر اساس *وضعیتش* وارد صف نمی‌شود بلکه بر اساس اینکه اثرِ
 * GOODS_INِ معلقی دارد یا نه — مرجوعی‌ای که تصمیمش «بازگشت وجه بدون
 * پس‌گرفتن کالا» است اصلاً به انبار نمی‌رسد.
 */
export async function fetchIncomingQueue(params = {}) {
  await delay(500);

  const { type = "", counterpartyIds = [] } = params;
  let rows = [];

  // INCOMING_TYPES.PURCHASE عددش صفر است؛ فیلترِ صریحِ همان مقدار
  // نباید مثل «فیلتری انتخاب نشده» رفتار کند وگرنه ردیف‌های مرجوعیِ
  // فروش هم قاطی می‌شوند.
  if (type === "" || type === INCOMING_TYPES.PURCHASE) {
    rows.push(...allPurchases.filter(isPurchaseAwaitingIntake).map(purchaseToRow));
  }
  if (type === "" || type === INCOMING_TYPES.SALES_RETURN) {
    rows.push(...allSalesReturns.filter(hasPendingGoodsIn).map(salesReturnToRow));
  }

  if (Array.isArray(counterpartyIds) && counterpartyIds.length > 0) {
    rows = rows.filter((row) =>
      counterpartyIds.includes(`${row.counterpartyType}:${row.counterpartyId}`),
    );
  }

  return applyListQuery(rows, params, {
    searchFields: ["refNumber", "counterpartyName"],
    dateField: "date",
    numericFields: ["amount", "itemsCount", "remainingQuantity"],
  });
}

/**
 * علاوه بر خودِ خرید، هر قلم با receivableQuantity (محاسبه‌ی تازه‌ی «الان
 * چقدر قابل دریافت است») enrich می‌شود و خطوط مرجوعیِ همان خرید هم
 * همراهش می‌آید. فرم دریافت باید فقط از همین مقادیر استفاده کند.
 */
export async function fetchReceivingPurchaseById(id) {
  await delay(300);

  const purchase = allPurchases.find((p) => Number(p.id) === Number(id));
  if (!purchase) throw new Error("خرید یافت نشد");

  return {
    ...purchase,
    items: purchase.items.map((item) => ({
      ...item,
      receivableQuantity: computeItemReceivableQuantity(item),
    })),
    returnLines: pendingReturnLinesForPurchase(purchase.id),
  };
}

/**
 * ثبت نهایی یک «دور دریافت» در انبار.
 *
 * ۱. مقدار دریافتی هر قلم تجمعی است — همین به‌طور طبیعی از دریافت‌های
 *    چندمرحله‌ای/چند-ماشینه پشتیبانی می‌کند.
 * ۲. اگر قلمی همچنان کسری داشته باشد، انباردار می‌تواند فقط بخشی از
 *    آن را به‌عنوان «مشکل واقعی» (نه صرفاً دیرکرد ارسال) گزارش کند؛
 *    باقیمانده‌ی گزارش‌نشده خودکار «در انتظار محموله بعدی» تلقی
 *    می‌شود و خرید همچنان SHIPPED و در صف می‌ماند.
 * ۳. موجودی دقیقاً به‌اندازه‌ی receivedQuantity همین دور افزایش می‌یابد.
 *    سقف هر issue برابر کسری است، یعنی issues همیشه *بیرون* از
 *    receivedQuantity قرار دارد: کالای معیوب اساساً در تعداد دریافتی شمرده
 *    نمی‌شود، پس کم‌کردن دوباره‌اش مقدار سالم را کمتر از واقع ثبت
 *    می‌کرد.
 * ۴. «مازاد» — کالای اضافه‌ی یک قلم شناخته‌شده و کالای کاملاً
 *    ثبت‌نشده — در purchase.surplusItems می‌نشیند، نه در items[].issues
 *    و نه در receivedQuantity. مازاد بیرون از سقف سفارش است و نباید در
 *    محاسباتی که به quantity/receivedQuantity وابسته‌اند شرکت کند. آرایه روی
 *    خودِ خرید است نه روی قلم، چون کالای ثبت‌نشده قلمی برای نشستن
 *    ندارد.
 * ۵. مازاد وارد موجودی قابل‌فروش نمی‌شود؛ کالا فیزیکاً هست ولی هنوز
 *    مال ما نیست و فقط با تصمیم «نگهداری» اضافه می‌شود.
 * ۶. یک قلم می‌تواند هم‌زمان کسری و مازاد داشته باشد. چون این دو در
 *    دو ساختار جدا می‌نشینند، هیچ‌کدام سقف دیگری را مصرف نمی‌کند.
 * ۷. خطوطِ مرجوعیِ همین رسید هر کدام یک دورِ اجرای اثر روی مرجوعیِ
 *    خودشان است؛ موجودی و وضعیت را همان موتور اثر جابه‌جا می‌کند.
 */
export async function confirmReceiving(
  purchaseId,
  receivingData,
  { idempotencyKey } = {},
) {
  return runOnce(idempotencyKey, () =>
    confirmReceivingOnce(purchaseId, receivingData),
  );
}

async function confirmReceivingOnce(purchaseId, receivingData) {
  await delay(500);

  const index = allPurchases.findIndex((p) => Number(p.id) === Number(purchaseId));
  if (index === -1) throw new Error("خرید یافت نشد");

  const purchase = allPurchases[index];
  const receivedDate =
    receivingData.receivedDate || new Date().toISOString().slice(0, 10);

  const stockIncreases = [];
  const newSurplusItems = [];
  // ادعاهایی که از دلِ گزارش همین دور بیرون می‌آیند و در پایان به یک
  // مرجوعیِ «در انتظار تصمیم» تبدیل می‌شوند.
  const roundClaims = [];

  const rows = receivingData.receivedItems || [];
  const orderRows = rows.filter(
    (row) => (row.source ?? RECEIVING_SOURCES.ORDER) === RECEIVING_SOURCES.ORDER,
  );
  const returnRows = rows.filter((row) => row.source === RECEIVING_SOURCES.RETURN);

  const updatedItems = purchase.items.map((item) => {
    const receivedItem = orderRows.find((ri) => ri.productId === item.productId);
    if (!receivedItem) return item;

    const thisRoundQuantity = receivedItem.receivedQuantity || 0;

    // فقط مقداری که انباردار صراحتاً «مشکل» علامت زده به تاریخچه
    // اضافه می‌شود؛ باقیِ کسری صرفاً یعنی هنوز نرسیده.
    const appended = (receivedItem.issues || [])
      .filter((b) => (Number(b.quantity) || 0) > 0)
      .map((b) => ({
        id: generateId(),
        // نوعِ مشکل enum عددی است و عضو صفر دارد؛ `||` مقدارِ صفر را با
        // پیش‌فرض جایگزین می‌کرد.
        type: b.type ?? DEFAULT_RECEIVING_ISSUE_TYPE,
        quantity: Number(b.quantity) || 0,
        note: b.note || "",
        date: receivedDate,
      }));

    if (thisRoundQuantity > 0) {
      stockIncreases.push({ productId: item.productId, delta: thisRoundQuantity });
    }

    // هر مشکلی که انباردار گزارش می‌کند یک *ادعا* روی تامین‌کننده است.
    // گزارش انبار همان «چه اتفاقی افتاد» است؛ «چه تصمیمی بگیریم» کارِ
    // واحد خرید است و در همان مرجوعی ثبت می‌شود.
    appended.forEach((issue) => {
      roundClaims.push({
        scope: CLAIM_SCOPES.ON_ORDER,
        offScopeKind: null,
        orderLineId: item.id,
        productId: item.productId,
        productCode: item.productCode,
        productName: item.productName,
        unit: item.unit,
        unitPrice: item.unitPrice || 0,
        quantity: issue.quantity,
        // مقادیر این دو enum عمداً یکی است تا گزارش انبار بدون ترجمه
        // به ادعای خرید تبدیل شود.
        problem: issue.type,
        note: issue.note || "",
      });
    });

    // قیمت واحدِ مازاد از خودِ قلم سفارش برداشته می‌شود، پس فرم لازم
    // نیست حملش کند — اگر بعداً «نگهداری و تسویه» تصمیم گرفته شود،
    // مبلغ از همین‌جا می‌آید.
    const excessQuantity = Number(receivedItem.excessQuantity) || 0;
    if (excessQuantity > 0) {
      newSurplusItems.push({
        id: generateId(),
        kind: SURPLUS_KINDS.EXCESS,
        productId: item.productId,
        productCode: item.productCode,
        productName: item.productName,
        unit: item.unit,
        quantity: excessQuantity,
        unitPrice: item.unitPrice || 0,
        note: receivedItem.excessNote || "",
        date: receivedDate,
      });
    }

    return {
      ...item,
      receivedQuantity: (item.receivedQuantity || 0) + thisRoundQuantity,
      issues:
        appended.length > 0 ? [...(item.issues || []), ...appended] : item.issues,
    };
  });

  // کالای ثبت‌نشده به هیچ قلمی وصل نیست: نه productId دارد نه
  // productCode، و قیمتش صفر است چون هنوز کسی قیمتی توافق نکرده.
  (receivingData.unknownItems || []).forEach((row) => {
    const quantity = Number(row.quantity) || 0;
    if (quantity <= 0 || !row.productName?.trim()) return;
    newSurplusItems.push({
      id: generateId(),
      kind: SURPLUS_KINDS.UNKNOWN,
      productId: null,
      productCode: null,
      productName: row.productName.trim(),
      unit: row.unit || "عدد",
      quantity,
      unitPrice: 0,
      note: row.note || "",
      date: receivedDate,
    });
  });

  // مازاد هم ادعاست، فقط بیرون از سقف سفارش: تا واحد خرید تصمیم
  // نگیرد (عودت، نگهداری با پرداخت، یا نگهداری بدون پرداخت) این کالا
  // بلاتکلیف در انبار می‌ماند و وارد موجودی قابل‌فروش نمی‌شود.
  newSurplusItems.forEach((surplus) => {
    const isExcess = surplus.kind === SURPLUS_KINDS.EXCESS;
    roundClaims.push({
      scope: CLAIM_SCOPES.OFF_ORDER,
      offScopeKind: isExcess ? OFF_ORDER_KINDS.EXCESS : OFF_ORDER_KINDS.UNLISTED,
      orderLineId: null,
      productId: surplus.productId,
      productCode: surplus.productCode,
      productName: surplus.productName,
      unit: surplus.unit,
      unitPrice: surplus.unitPrice || 0,
      quantity: surplus.quantity,
      problem: isExcess
        ? PURCHASE_RETURN_PROBLEMS.OVER_SHIPPED
        : PURCHASE_RETURN_PROBLEMS.UNLISTED_ITEM,
      note: surplus.note || "",
    });
  });

  allPurchases[index] = {
    ...purchase,
    items: updatedItems,
    status: nextPurchaseStatus(purchase, updatedItems),
    // مازاد تجمعی است، مثل issues: هر دور فقط به آن اضافه می‌کند.
    surplusItems:
      newSurplusItems.length > 0
        ? [...(purchase.surplusItems || []), ...newSurplusItems]
        : purchase.surplusItems,
    receivedItems: rows,
    receivingNote: receivingData.receivingNote,
    receivedDate,
    transporterName: receivingData.transporterName || "",
    transporterPhone: receivingData.transporterPhone || "",
    vehiclePlate: receivingData.vehiclePlate || "",
    updatedAt: new Date().toISOString(),
  };

  adjustProductsStock(stockIncreases);

  if (roundClaims.length > 0) {
    await createPurchaseReturn({
      purchaseId: purchase.id,
      purchaseInvoiceNumber: purchase.invoiceNumber,
      supplierId: purchase.supplierId,
      supplierName: purchase.supplierName,
      returnDate: receivedDate,
      description: `ثبت خودکار از گزارش انبار در تاریخ ${receivedDate}`,
      claims: roundClaims,
    });
  }

  await applyReturnRows(
    returnRows,
    {
      date: receivedDate,
      partyName: receivingData.transporterName,
      partyNationalId: receivingData.transporterPhone,
      vehiclePlate: receivingData.vehiclePlate,
      note: receivingData.receivingNote,
    },
    executePurchaseReturnRound,
  );

  return allPurchases[allPurchases.findIndex((p) => Number(p.id) === Number(purchaseId))];
}

/**
 * ثبت یک دور تحویل‌گرفتن کالای برگشتی از مشتری.
 *
 * ورودی همان payloadی است که فرمِ دریافت خرید می‌سازد، تا هر دو مسیر
 * یک شکل داشته باشند و انباردار یک رفتار یاد بگیرد نه دو تا. اینجا
 * خطِ سفارشی وجود ندارد، پس همه‌ی ردیف‌ها مرجوعی‌اند.
 */
export async function confirmReturnIntake(
  returnId,
  intakeData,
  { idempotencyKey } = {},
) {
  return runOnce(idempotencyKey, () =>
    confirmReturnIntakeOnce(returnId, intakeData),
  );
}

async function confirmReturnIntakeOnce(returnId, intakeData) {
  const updated = await applyReturnRows(
    intakeData.receivedItems || [],
    {
      date: intakeData.receivedDate,
      partyName: intakeData.transporterName,
      partyNationalId: intakeData.transporterPhone,
      vehiclePlate: intakeData.vehiclePlate,
      note: intakeData.receivingNote,
    },
    executeSalesReturnRound,
    returnId,
  );

  if (!updated) throw new Error("هیچ کالایی برای ثبت انتخاب نشده است");
  return updated;
}
