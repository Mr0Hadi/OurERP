import { allSales } from "@/features/sales/orders/services/mockData";
import {
  CLAIM_SCOPES,
  OFF_INVOICE_KINDS,
  RETURN_PROBLEMS,
  SALES_RETURN_STATUSES,
} from "../domain/returnVocabulary";
import { EFFECT_STATUSES, PAYMENT_METHODS } from "@/shared/domain/returns/effects";
import {
  MONEY_DIRECTIONS,
  buildResolution,
  deriveReturnStatus,
  emptyComposition,
  emptyMoney,
} from "@/shared/domain/returns/resolutions";

/**
 * داده‌ی نمونه‌ی مرجوعی فروش، روی مدل جدید.
 *
 * شکل رکورد:
 *
 *   salesReturn
 *     ├─ claims[]              ← ادعای واحد فروش
 *     │    └─ resolutions[]    ← تصمیم‌ها (returnResolutions.js)
 *     │         └─ effects[]   ← اثرهای پایه (returnEffects.js)
 *     └─ previousReturnId      ← زنجیره‌ی مرجوعی‌های پیاپیِ یک فروش
 *
 * تفاوت‌های ساختاری با مدل قبلی که عمدی‌اند:
 *
 * • «قلم» و «ادعا» یکی شده‌اند. قبلاً یک item بود که داخلش claims و
 *   issues و resolutions با هم می‌نشستند و هر سه سقف‌های متفاوتی
 *   داشتند. حالا هر ادعا یک ردیف مستقل است: یک کالا، یک مشکل، یک
 *   تعداد. دو مشکل مختلف روی یک کالا = دو ادعا.
 *
 * • «بازرسی» فیلد جدا ندارد. یافته‌های انبار روی اجرای اثرِ GOODS_IN
 *   ثبت می‌شوند (history + restockedQty)، چون بازرسی دیگر یک مرحله‌ی
 *   اجباریِ جداگانه نیست — فقط چیزی است که هنگام تحویل‌گرفتن کالا
 *   اتفاق می‌افتد، و کالا هم فقط وقتی برمی‌گردد که تصمیمی آن را
 *   خواسته باشد.
 *
 * • وضعیت ذخیره می‌شود ولی منبع حقیقت نیست؛ deriveReturnStatus آن را
 *   از روی ادعاها و اثرها می‌سازد.
 */

// ─── کمکی‌ها ────────────────────────────────────────────────────────────────

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pickRandom(arr) {
  return arr[randomInt(0, arr.length - 1)];
}
function formatDate(d) {
  return d.toISOString().slice(0, 10);
}
const generateId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

// مرجوعی فقط برای فروش‌هایی معنا دارد که واقعاً چیزی از انبار برایشان
// خارج شده باشد — چه کامل چه ناقص.
export const RETURN_ELIGIBLE_SALE_STATUSES = [
  "shipped",
  "delivered",
  "partially_delivered",
];

// مشکل‌هایی که برای ادعای *روی فاکتور* معنا دارند. اضافه‌ارسال اینجا
// نیست چون طبق تعریف بیرون از سقف خط فاکتور می‌افتد.
const ON_INVOICE_PROBLEMS = [
  RETURN_PROBLEMS.DEFECTIVE,
  RETURN_PROBLEMS.DAMAGED_IN_TRANSIT,
  RETURN_PROBLEMS.QUALITY_ISSUE,
  RETURN_PROBLEMS.WRONG_ITEM_SHIPPED,
  RETURN_PROBLEMS.WRONG_ITEM_INVOICED,
  RETURN_PROBLEMS.WRONG_ITEM_ORDERED,
  RETURN_PROBLEMS.SHORT_SHIPPED,
  RETURN_PROBLEMS.WRONG_QTY_INVOICED,
  RETURN_PROBLEMS.WRONG_QTY_ORDERED,
  RETURN_PROBLEMS.CHANGED_MIND,
];

// ─── ساخت ادعا ──────────────────────────────────────────────────────────────

function buildClaim({ saleItem, qty, problem, scope, offScopeKind }) {
  return {
    id: generateId(),
    scope,
    offScopeKind: scope === CLAIM_SCOPES.OFF_INVOICE ? offScopeKind : null,
    orderLineId: scope === CLAIM_SCOPES.ON_INVOICE ? saleItem.id : null,
    productId: saleItem.productId,
    productCode: saleItem.productCode,
    productName: saleItem.productName,
    unit: saleItem.unit,
    unitPrice: saleItem.unitPrice,
    qty,
    problem,
    note: "",
    resolutions: [],
    createdAt: new Date().toISOString(),
  };
}

/**
 * چند تصمیمِ نمونه روی یک ادعا می‌گذارد تا داده‌ی اولیه هر سه وضعیت
 * (باز / در حال اجرا / تسویه‌شده) را نشان دهد.
 *
 * ترکیب‌ها عمداً متنوع‌اند تا نمونه‌ای از همه‌ی حالت‌های ممکن در داده‌ی
 * اولیه دیده شود: هم تصمیمِ فقط-پولی (که اصلاً پای انبار را وسط
 * نمی‌کشد) و هم تصمیمی که کالا را برمی‌گرداند.
 */
function seedResolutions(claim, target) {
  if (target === "open") return;

  const money = (direction, amount, method = PAYMENT_METHODS.CASH) => ({
    direction,
    amount,
    method,
    reference: "",
    parts: [],
  });

  if (target === "in_progress") {
    // ترکیبی با اثر کالاییِ معلق — همان چیزی که انبار باید ببیند.
    // نیمی از نمونه‌ها «پس‌گرفتن + بازگشت وجه» (صف دریافت) و نیم دیگر
    // «پس‌گرفتن + ارسال جایگزین» (هر دو صف) می‌گیرند، تا داده‌ی اولیه
    // هم صف دریافت انبار را پر کند و هم صف ارسال.
    const half = Math.max(1, Math.floor(claim.qty / 2));
    const withReplacement = Math.random() < 0.5;

    claim.resolutions.push(
      buildResolution(
        {
          ...emptyComposition(half),
          goodsIn: { enabled: true, items: [] },
          goodsOut: withReplacement
            ? {
                enabled: true,
                items: [
                  {
                    productId: claim.productId,
                    productCode: claim.productCode,
                    productName: claim.productName,
                    unit: claim.unit,
                    qty: half,
                    unitPrice: claim.unitPrice,
                  },
                ],
              }
            : { enabled: false, items: [] },
          money: withReplacement
            ? emptyMoney()
            : money(MONEY_DIRECTIONS.PAY, half * claim.unitPrice),
        },
        claim,
      ),
    );
    return;
  }

  // target === "settled" — فقط ترکیب‌های بدون اثر کالایی، تا وضعیت
  // مشتق‌شده بدون دخالت انبار به SETTLED برسد.
  // برای اینکه داده‌ی اولیه هر پنج روش را نشان بدهد، روشِ هر نمونه
  // چرخشی انتخاب می‌شود.
  const isOffInvoice = claim.scope === CLAIM_SCOPES.OFF_INVOICE;
  const direction = isOffInvoice
    ? MONEY_DIRECTIONS.RECEIVE
    : MONEY_DIRECTIONS.PAY;
  const method = pickRandom(
    isOffInvoice
      ? [PAYMENT_METHODS.CASH, PAYMENT_METHODS.TRANSFER, PAYMENT_METHODS.ON_ACCOUNT]
      : [
          PAYMENT_METHODS.CASH,
          PAYMENT_METHODS.CHECK,
          PAYMENT_METHODS.ON_ACCOUNT,
          PAYMENT_METHODS.STORE_CREDIT,
        ],
  );

  claim.resolutions.push(
    buildResolution(
      {
        ...emptyComposition(claim.qty),
        money: money(direction, claim.qty * claim.unitPrice, method),
      },
      claim,
    ),
  );
}

// ─── ساخت مرجوعی از روی یک فروش ─────────────────────────────────────────────

const SEED_TARGETS = [
  "open",
  "in_progress",
  "settled",
  "settled",
  SALES_RETURN_STATUSES.REJECTED,
  SALES_RETURN_STATUSES.CANCELLED,
];

function buildReturnFromSale(sale, index) {
  const target = SEED_TARGETS[index % SEED_TARGETS.length];
  const isExplicitlyClosed =
    target === SALES_RETURN_STATUSES.REJECTED ||
    target === SALES_RETURN_STATUSES.CANCELLED;

  const pickedItems = [...sale.items]
    .sort(() => 0.5 - Math.random())
    .slice(0, Math.min(sale.items.length, randomInt(1, 2)));

  const claims = pickedItems.map((item) => {
    const delivered = item.shippedQty ?? item.qty;
    const qty = Math.max(1, Math.min(delivered, randomInt(1, 4)));
    const claim = buildClaim({
      saleItem: item,
      qty,
      problem: pickRandom(ON_INVOICE_PROBLEMS),
      scope: CLAIM_SCOPES.ON_INVOICE,
    });
    if (!isExplicitlyClosed) seedResolutions(claim, target);
    return claim;
  });

  // هر چند مرجوعی، یک ادعای «خارج از فاکتور» هم می‌گیرد تا این مسیر
  // در داده‌ی اولیه دیده شود — قرینه‌ی مازاد در مرجوعی خرید.
  if (index % 3 === 1) {
    const item = pickedItems[0];
    const claim = buildClaim({
      saleItem: item,
      qty: randomInt(1, 3),
      problem: RETURN_PROBLEMS.OVER_SHIPPED,
      scope: CLAIM_SCOPES.OFF_INVOICE,
      offScopeKind: OFF_INVOICE_KINDS.EXCESS,
    });
    if (!isExplicitlyClosed) seedResolutions(claim, target);
    claims.push(claim);
  }

  const createdDate = new Date(sale.createdAt);
  createdDate.setDate(createdDate.getDate() + randomInt(3, 20));

  const record = {
    id: index + 1,
    returnNumber: `SRET-2026-${String(index + 1).padStart(3, "0")}`,
    saleId: sale.id,
    saleInvoiceNumber: sale.invoiceNumber,
    customerId: sale.customerId,
    customerName: sale.customerName,
    returnDate: formatDate(createdDate),
    status: isExplicitlyClosed ? target : SALES_RETURN_STATUSES.OPEN,
    description: "",
    previousReturnId: null,
    sourceEffectId: null,
    claims,
    totalClaimedAmount: claims.reduce((s, c) => s + c.qty * c.unitPrice, 0),
    createdAt: createdDate.toISOString(),
    updatedAt: createdDate.toISOString(),
  };

  // برای هدفِ settled، اثرهای کالاییِ معلق باید «اجراشده» شوند وگرنه
  // وضعیت مشتق‌شده هرگز به SETTLED نمی‌رسد.
  if (target === "settled") markAllGoodsEffectsDone(record);

  record.status = isExplicitlyClosed ? target : deriveReturnStatus(record);
  return record;
}

function markAllGoodsEffectsDone(record) {
  record.claims.forEach((claim) =>
    (claim.resolutions || []).forEach((res) =>
      (res.effects || []).forEach((effect) => {
        if (effect.status !== EFFECT_STATUSES.PENDING) return;
        effect.doneQty = effect.qty;
        if (effect.restockedQty !== null) effect.restockedQty = effect.qty;
        effect.status = EFFECT_STATUSES.APPLIED;
        effect.appliedAt = new Date().toISOString();
      }),
    ),
  );
}

// ─── خروجی ──────────────────────────────────────────────────────────────────

const seedEligibleSales = allSales.filter((s) =>
  RETURN_ELIGIBLE_SALE_STATUSES.includes(s.status),
);

export const salesReturnsMock = seedEligibleSales
  .slice(0, 8)
  .map((sale, idx) => buildReturnFromSale(sale, idx));

export const allSalesReturns = [...salesReturnsMock];
