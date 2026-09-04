/**
 * هارنس وارسی صف‌های انبار (دریافت و ارسال).
 *
 * چرا جدا از check-sales-returns: آن یکی منطقِ *دامنه‌ی* مرجوعی را
 * می‌سنجد؛ این یکی قرارداد بین «صف» و «صفحه‌ی جزئیات» را — یعنی
 * چیزی که کاربر به‌عنوان عددِ روی لیست می‌بیند باید دقیقاً همان کاری
 * باشد که با باز کردن آن ردیف جلویش می‌آید.
 *
 * این تنها جایی است که آن دو نما کنار هم اجرا و مقایسه می‌شوند؛ بدون
 * آن، ناهمخوانی‌شان فقط با چشم و روی داده‌ی واقعی پیدا می‌شود.
 *
 * اجرا:  pnpm check:queues
 */
import { register } from "node:module";

register("./extensionless-resolver.js", import.meta.url);

const receiving = await import(
  "../src/features/warehouse/receiving/services/api-mockData.js"
);
const shipping = await import(
  "../src/features/warehouse/shipping/services/api-mockData.js"
);
const { allPurchases } = await import(
  "../src/features/purchases/orders/services/mockData.js"
);
const { allSales } = await import(
  "../src/features/sales/orders/services/mockData.js"
);
const { allSalesReturns } = await import(
  "../src/features/sales/returns/services/mockData.js"
);
const { RECEIVING_ISSUE_TYPES } = await import(
  "../src/features/warehouse/receiving/domain/receivingVocabulary.js"
);
const { buildGoodsLines } = await import(
  "../src/shared/domain/returns/resolutions.js"
);
const { EFFECT_KINDS } = await import("../src/shared/domain/returns/effects.js");
const { PurchaseStatusEnum: PURCHASE_STATUSES } = await import(
  "../src/shared/domain/enums/purchaseStatus.js"
);
const { SaleStatusEnum: SALE_STATUSES } = await import(
  "../src/shared/domain/enums/saleStatus.js"
);

let failures = 0;
let sectionNo = 0;

function section(title) {
  sectionNo += 1;
  console.log(`\n${sectionNo}) ${title}`);
}

function check(name, condition, extra = "") {
  if (condition) {
    console.log(`  ok   ${name}`);
  } else {
    failures += 1;
    console.log(`  FAIL ${name} ${extra}`);
  }
}

const QUEUE_PARAMS = { page: 1, limit: 200 };

async function incomingRow(refNumber) {
  const { items } = await receiving.fetchIncomingQueue(QUEUE_PARAMS);
  return items.find((row) => row.refNumber === refNumber);
}

async function outgoingRow(refNumber) {
  const { items } = await shipping.fetchOutgoingQueue(QUEUE_PARAMS);
  return items.find((row) => row.refNumber === refNumber);
}

// ─── دریافت: خرید ───────────────────────────────────────────────────────────

section("صف دریافت: بعد از یک دور ناقص، عدد لیست با جزئیات می‌خواند");
{
  const purchase = allPurchases.find(
    (p) => p.status === PURCHASE_STATUSES.SHIPPED && (p.items || []).length >= 3,
  );

  const rowBefore = await incomingRow(purchase.invoiceNumber);
  check("خرید در صف دریافت هست", Boolean(rowBefore));

  const [first, second] = purchase.items;
  await receiving.confirmReceiving(purchase.id, {
    receivedItems: [
      // قلم اول کامل بسته می‌شود
      {
        source: "order",
        productId: first.productId,
        expectedQuantity: first.quantity,
        receivedQuantity: first.quantity,
        issues: [],
      },
      // قلم دوم ناقص، با گزارش یک عدد معیوب — باقیمانده‌اش باید باز بماند
      {
        source: "order",
        productId: second.productId,
        expectedQuantity: second.quantity,
        receivedQuantity: Math.max(1, second.quantity - 3),
        issues: [{ type: RECEIVING_ISSUE_TYPES.DEFECTIVE, quantity: 1, note: "" }],
      },
    ],
    receivedDate: "2026-08-23",
    transporterName: "راننده",
  });

  const detail = await receiving.fetchReceivingPurchaseById(purchase.id);
  const openLines =
    detail.items.filter((item) => item.receivableQuantity > 0).length +
    (detail.returnLines || []).length;
  const openQuantity =
    detail.items.reduce((sum, item) => sum + item.receivableQuantity, 0) +
    (detail.returnLines || []).reduce((sum, line) => sum + line.remainingQuantity, 0);

  const rowAfter = await incomingRow(purchase.invoiceNumber);

  check("قلمِ بسته‌شده دیگر شمرده نمی‌شود", rowAfter.itemsCount === openLines,
    `لیست ${rowAfter.itemsCount} / جزئیات ${openLines}`);
  check("تعداد باقی‌مانده هم با جزئیات می‌خواند", rowAfter.remainingQuantity === openQuantity,
    `لیست ${rowAfter.remainingQuantity} / جزئیات ${openQuantity}`);
  check("قلمِ ناقص هنوز باز است", openLines > 0, String(openLines));
}

// ─── دریافت: مرجوعی فروش ────────────────────────────────────────────────────

section("صف دریافت: ردیف مرجوعی فقط خطوطِ معلق را می‌شمارد");
{
  const salesReturn = allSalesReturns.find((ret) =>
    buildGoodsLines(ret, EFFECT_KINDS.GOODS_IN).some((l) => l.remainingQuantity > 0),
  );
  check("مرجوعیِ در انتظارِ دریافت در داده‌ی نمونه هست", Boolean(salesReturn));

  const openLines = buildGoodsLines(salesReturn, EFFECT_KINDS.GOODS_IN).filter(
    (line) => line.remainingQuantity > 0,
  );
  const row = await incomingRow(salesReturn.returnNumber);

  check("تعداد اقلام = خطوطِ معلق", row.itemsCount === openLines.length,
    `${row.itemsCount} / ${openLines.length}`);
  check(
    "تعداد باقی‌مانده = مجموع مقدارِ معلق",
    row.remainingQuantity === openLines.reduce((s, l) => s + l.remainingQuantity, 0),
    String(row.remainingQuantity),
  );
}

// ─── ارسال ──────────────────────────────────────────────────────────────────

section("صف ارسال: قلمِ کاملاً ارسال‌شده از شمارش بیرون می‌رود");
{
  const sale = allSales.find(
    (s) =>
      (s.status === SALE_STATUSES.PROCESSING ||
        s.status === SALE_STATUSES.PARTIALLY_DELIVERED) &&
      (s.items || []).length >= 2 &&
      s.items.some((i) => (i.quantity || 0) - (i.shippedQuantity || 0) > 0),
  );
  check("فروشِ در انتظار ارسال در داده‌ی نمونه هست", Boolean(sale));

  const target = sale.items.find((i) => (i.quantity || 0) - (i.shippedQuantity || 0) > 0);
  await shipping.confirmShipment(sale.id, {
    shippedItems: [
      {
        source: "order",
        productId: target.productId,
        shippedQuantity: target.quantity - (target.shippedQuantity || 0),
      },
    ],
    shippedDate: "2026-08-23",
    driverName: "راننده",
  });

  const detail = await shipping.fetchShippingSaleById(sale.id);
  const openLines =
    detail.items.filter((item) => item.shippableQuantity > 0).length +
    (detail.returnLines || []).length;

  const row = await outgoingRow(sale.invoiceNumber);
  // اگر چیزی باقی نمانده باشد، فروش اصلاً از صف بیرون می‌رود
  if (row) {
    check("تعداد اقلام = خطوطِ باز", row.itemsCount === openLines,
      `لیست ${row.itemsCount} / جزئیات ${openLines}`);
  } else {
    check("فروشِ کامل‌شده از صف خارج شد", openLines === 0, String(openLines));
  }
}

console.log("");
if (failures > 0) {
  throw new Error(`${failures} سناریو شکست خورد`);
}
console.log("✅ همه‌ی سناریوها پذیرفته شدند");
