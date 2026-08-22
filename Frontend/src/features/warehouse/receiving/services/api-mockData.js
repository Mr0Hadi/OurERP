import { allPurchases } from "./mockData";
import { adjustProductsStock } from "@/features/warehouse/products/services/api-mockData";
import { applyListQuery } from "@/shared/services/mockQuery";
import { SURPLUS_KINDS } from "@/shared/constants/purchaseIssueTypes";

import { allSalesReturns } from "@/features/sales/returns/services/mockData";
import { executeGoodsRound as executeSalesReturnRound } from "@/features/sales/returns/services/api-mockData";
import { allPurchaseReturns } from "@/features/purchases/returns/services/mockData";
import { executeGoodsRound as executePurchaseReturnRound } from "@/features/purchases/returns/services/api-mockData";
import {
  buildGoodsLines,
  hasPendingGoodsIn,
  pendingGoodsEffects,
} from "@/shared/domain/returns/resolutions";
import { EFFECT_KINDS } from "@/shared/domain/returns/effects";

import {
  INCOMING_TYPES,
  RECEIVING_ELIGIBLE_STATUSES,
  RECEIVING_SOURCES,
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

/**
 * چقدر از یک قلم خرید هنوز قابل دریافت است.
 *
 * در مدل فعلی، مرجوعی هیچ خطی از سفارش را نمی‌بندد — اثرهایش مستقیم
 * روی موجودی و مبلغ می‌نشینند — پس این فقط یک تفریق ساده است.
 */
function computeItemReceivableQty(item) {
  return Math.max(0, (Number(item.qty) || 0) - (Number(item.receivedQty) || 0));
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
      if (line.remainingQty <= 0) return;
      lines.push({ ...line, returnId: ret.id, returnNumber: ret.returnNumber });
    });
  });
  return lines;
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

function purchaseToRow(purchase) {
  const returnLines = pendingReturnLinesForPurchase(purchase.id);
  return {
    id: purchase.id,
    type: INCOMING_TYPES.PURCHASE,
    refNumber: purchase.invoiceNumber,
    counterpartyId: purchase.supplierId,
    counterpartyType: "supplier",
    counterpartyName: purchase.supplierName,
    date: purchase.invoiceDate,
    itemsCount: (purchase.items || []).length + returnLines.length,
    returnLinesCount: returnLines.length,
    amount: purchase.totalAmount,
    createdAt: purchase.createdAt,
    updatedAt: purchase.updatedAt,
  };
}

function salesReturnToRow(salesReturn) {
  return {
    id: salesReturn.id,
    type: INCOMING_TYPES.SALES_RETURN,
    refNumber: salesReturn.returnNumber,
    counterpartyId: salesReturn.customerId,
    counterpartyType: "customer",
    counterpartyName: salesReturn.customerName,
    date: salesReturn.returnDate,
    itemsCount: pendingGoodsEffects(salesReturn, EFFECT_KINDS.GOODS_IN).length,
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
 * پرش کند.
 */
async function applyReturnRows(rows, logistics, executeRound, fallbackReturnId) {
  const byReturn = new Map();

  rows.forEach((row) => {
    const qty = Number(row.receivedQty) || 0;
    if (qty <= 0) return;
    const issuesQty = (row.issues || []).reduce(
      (sum, i) => sum + (Number(i.qty) || 0),
      0,
    );
    const entry = {
      effectId: row.effectId,
      qty,
      healthyQty: Math.max(0, qty - issuesQty),
      issueNote: (row.issues || [])
        .map((i) => i.note)
        .filter(Boolean)
        .join(" / "),
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

  if (!type || type === INCOMING_TYPES.PURCHASE) {
    rows.push(...allPurchases.filter(isPurchaseAwaitingIntake).map(purchaseToRow));
  }
  if (!type || type === INCOMING_TYPES.SALES_RETURN) {
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
    numericFields: ["amount", "itemsCount"],
  });
}

/**
 * علاوه بر خودِ خرید، هر قلم با receivableQty (محاسبه‌ی تازه‌ی «الان
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
      receivableQty: computeItemReceivableQty(item),
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
 * ۳. موجودی دقیقاً به‌اندازه‌ی receivedQty همین دور افزایش می‌یابد.
 *    سقف هر issue برابر کسری است، یعنی issues همیشه *بیرون* از
 *    receivedQty قرار دارد: کالای معیوب اساساً در تعداد دریافتی شمرده
 *    نمی‌شود، پس کم‌کردن دوباره‌اش مقدار سالم را کمتر از واقع ثبت
 *    می‌کرد.
 * ۴. «مازاد» — کالای اضافه‌ی یک قلم شناخته‌شده و کالای کاملاً
 *    ثبت‌نشده — در purchase.surplusItems می‌نشیند، نه در items[].issues
 *    و نه در receivedQty. مازاد بیرون از سقف سفارش است و نباید در
 *    محاسباتی که به qty/receivedQty وابسته‌اند شرکت کند. آرایه روی
 *    خودِ خرید است نه روی قلم، چون کالای ثبت‌نشده قلمی برای نشستن
 *    ندارد.
 * ۵. مازاد وارد موجودی قابل‌فروش نمی‌شود؛ کالا فیزیکاً هست ولی هنوز
 *    مال ما نیست و فقط با تصمیم «نگهداری» اضافه می‌شود.
 * ۶. یک قلم می‌تواند هم‌زمان کسری و مازاد داشته باشد. چون این دو در
 *    دو ساختار جدا می‌نشینند، هیچ‌کدام سقف دیگری را مصرف نمی‌کند.
 * ۷. خطوطِ مرجوعیِ همین رسید هر کدام یک دورِ اجرای اثر روی مرجوعیِ
 *    خودشان است؛ موجودی و وضعیت را همان موتور اثر جابه‌جا می‌کند.
 */
export async function confirmReceiving(purchaseId, receivingData) {
  await delay(500);

  const index = allPurchases.findIndex((p) => Number(p.id) === Number(purchaseId));
  if (index === -1) throw new Error("خرید یافت نشد");

  const purchase = allPurchases[index];
  const receivedDate =
    receivingData.receivedDate || new Date().toISOString().slice(0, 10);

  const stockIncreases = [];
  const newSurplusItems = [];

  const rows = receivingData.receivedItems || [];
  const orderRows = rows.filter(
    (row) => (row.source ?? RECEIVING_SOURCES.ORDER) === RECEIVING_SOURCES.ORDER,
  );
  const returnRows = rows.filter((row) => row.source === RECEIVING_SOURCES.RETURN);

  const updatedItems = purchase.items.map((item) => {
    const receivedItem = orderRows.find((ri) => ri.productId === item.productId);
    if (!receivedItem) return item;

    const thisRoundQty = receivedItem.receivedQty || 0;

    // فقط مقداری که انباردار صراحتاً «مشکل» علامت زده به تاریخچه
    // اضافه می‌شود؛ باقیِ کسری صرفاً یعنی هنوز نرسیده.
    const appended = (receivedItem.issues || [])
      .filter((b) => (Number(b.qty) || 0) > 0)
      .map((b) => ({
        id: generateId(),
        type: b.type || "shortage",
        qty: Number(b.qty) || 0,
        note: b.note || "",
        date: receivedDate,
      }));

    if (thisRoundQty > 0) {
      stockIncreases.push({ productId: item.productId, delta: thisRoundQty });
    }

    // قیمت واحدِ مازاد از خودِ قلم سفارش برداشته می‌شود، پس فرم لازم
    // نیست حملش کند — اگر بعداً «نگهداری و تسویه» تصمیم گرفته شود،
    // مبلغ از همین‌جا می‌آید.
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
      receivedQty: (item.receivedQty || 0) + thisRoundQty,
      issues:
        appended.length > 0 ? [...(item.issues || []), ...appended] : item.issues,
    };
  });

  // کالای ثبت‌نشده به هیچ قلمی وصل نیست: نه productId دارد نه
  // productCode، و قیمتش صفر است چون هنوز کسی قیمتی توافق نکرده.
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
    // مازاد تجمعی است، مثل issues: هر دور فقط به آن اضافه می‌کند.
    surplusItems:
      newSurplusItems.length > 0
        ? [...(purchase.surplusItems || []), ...newSurplusItems]
        : purchase.surplusItems,
    receivedItems: rows,
    receivingNote: receivingData.receivingNote,
    receivedDate,
    transporterName: receivingData.transporterName || "",
    transporterNationalId: receivingData.transporterNationalId || "",
    vehiclePlate: receivingData.vehiclePlate || "",
    updatedAt: new Date().toISOString(),
  };

  adjustProductsStock(stockIncreases);

  await applyReturnRows(
    returnRows,
    {
      date: receivedDate,
      partyName: receivingData.transporterName,
      partyNationalId: receivingData.transporterNationalId,
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
export async function confirmReturnIntake(returnId, intakeData) {
  const updated = await applyReturnRows(
    intakeData.receivedItems || [],
    {
      date: intakeData.receivedDate,
      partyName: intakeData.transporterName,
      partyNationalId: intakeData.transporterNationalId,
      vehiclePlate: intakeData.vehiclePlate,
      note: intakeData.receivingNote,
    },
    executeSalesReturnRound,
    returnId,
  );

  if (!updated) throw new Error("هیچ کالایی برای ثبت انتخاب نشده است");
  return updated;
}
