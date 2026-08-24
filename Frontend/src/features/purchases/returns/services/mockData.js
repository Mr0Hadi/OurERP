import { allPurchases } from "@/features/purchases/orders/services/mockData";
import { PURCHASE_STATUSES } from "@/features/purchases/orders/services/constants";
import {
  CLAIM_SCOPES,
  OFF_ORDER_KINDS,
  PURCHASE_RETURN_PROBLEMS,
  PURCHASE_RETURN_STATUSES,
} from "../domain/purchaseReturnVocabulary";
import { EFFECT_STATUSES, PAYMENT_METHODS } from "@/shared/domain/returns/effects";
import {
  MONEY_DIRECTIONS,
  buildResolution,
  deriveReturnStatus,
  emptyComposition,
  emptyMoney,
} from "@/shared/domain/returns/resolutions";

/**
 * داده‌ی نمونه‌ی مرجوعی خرید — روی همان مدلی که مرجوعی فروش دارد.
 *
 *   purchaseReturn
 *     ├─ claims[]              ← ادعای واحد خرید
 *     │    └─ resolutions[]    ← تصمیم‌ها (shared/domain/returns)
 *     │         └─ effects[]   ← اثرهای پایه
 *     └─ previousReturnId      ← زنجیره‌ی مرجوعی‌های پیاپیِ یک خرید
 *
 * تفاوت‌های ساختاری با نسخه‌ی قبلی:
 *
 * • «گزارش مغایرت انبار» دیگر پیش‌شرط نیست. قبلاً یک مرجوعی خرید فقط
 *   وقتی وجود داشت که انبار هنگام دریافت کسری/مازاد ثبت کرده باشد، و
 *   ردیف‌های «قابل پیگیری» به‌صورت مجازی از همان گزارش ساخته می‌شدند.
 *   حالا واحد خرید مثل واحد فروش، مستقیم روی خودِ سفارش ادعا ثبت
 *   می‌کند.
 *
 * • claimKind (کسری/مازاد) که تعیین می‌کرد چه تصمیم‌هایی مجازند حذف
 *   شده. جایش scope نشسته که فقط سقفِ ادعا را تعیین می‌کند، نه
 *   تصمیم‌ها را — چون هر ترکیبی از کالا و پول برای هر ادعایی ممکن است.
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

// مرجوعی فقط برای خریدهایی معنا دارد که چیزی از آن‌ها واقعاً رسیده
// باشد — چه کامل چه ناقص.
export const RETURN_ELIGIBLE_PURCHASE_STATUSES = [
  PURCHASE_STATUSES.RECEIVED,
  PURCHASE_STATUSES.PARTIALLY_RECEIVED,
];

const ON_ORDER_PROBLEMS = [
  PURCHASE_RETURN_PROBLEMS.SHORT_SHIPPED,
  PURCHASE_RETURN_PROBLEMS.DEFECTIVE,
  PURCHASE_RETURN_PROBLEMS.DAMAGED_IN_TRANSIT,
  PURCHASE_RETURN_PROBLEMS.WRONG_ITEM_SHIPPED,
  PURCHASE_RETURN_PROBLEMS.EXPIRED,
  PURCHASE_RETURN_PROBLEMS.QUALITY_ISSUE,
];

// ─── ساخت ادعا ──────────────────────────────────────────────────────────────

function buildClaim({ purchaseItem, qty, problem, scope, offScopeKind }) {
  return {
    id: generateId(),
    scope,
    offScopeKind: scope === CLAIM_SCOPES.OFF_ORDER ? offScopeKind : null,
    orderLineId: scope === CLAIM_SCOPES.ON_ORDER ? purchaseItem.id : null,
    productId: purchaseItem.productId,
    productCode: purchaseItem.productCode,
    productName: purchaseItem.productName,
    unit: purchaseItem.unit,
    unitPrice: purchaseItem.unitPrice,
    qty,
    problem,
    note: "",
    resolutions: [],
    createdAt: new Date().toISOString(),
  };
}

/**
 * چند تصمیمِ نمونه تا داده‌ی اولیه هر سه وضعیت را نشان بدهد و هر دو
 * صف انبار (عودت و دریافت جایگزین) پر شوند.
 */
function seedResolutions(claim, target) {
  if (target === PURCHASE_RETURN_STATUSES.OPEN) return;

  const money = (direction, amount, method = PAYMENT_METHODS.CASH) => ({
    direction,
    amount,
    method,
    reference: "",
    parts: [],
  });

  if (target === PURCHASE_RETURN_STATUSES.IN_PROGRESS) {
    const half = Math.max(1, Math.floor(claim.qty / 2));
    const withReplacement = Math.random() < 0.5;

    claim.resolutions.push(
      buildResolution(
        {
          ...emptyComposition(half),
          // عودت کالا به تامین‌کننده = خروج از انبار ما
          goodsOut: { enabled: true, items: [] },
          // نیمی از نمونه‌ها جایگزین می‌گیرند، نیم دیگر پول
          goodsIn: withReplacement
            ? { enabled: true, items: [] }
            : { enabled: false, items: [] },
          money: withReplacement
            ? emptyMoney()
            : money(MONEY_DIRECTIONS.RECEIVE, half * claim.unitPrice),
        },
        claim,
      ),
    );
    return;
  }

  // target === PURCHASE_RETURN_STATUSES.SETTLED — فقط ترکیب‌های بدون اثر کالایی، تا وضعیتِ
  // مشتق‌شده بدون دخالت انبار به SETTLED برسد.
  const isOffOrder = claim.scope === CLAIM_SCOPES.OFF_ORDER;
  const direction = isOffOrder
    ? MONEY_DIRECTIONS.PAY // کالای اضافه را نگه می‌داریم و پولش را می‌دهیم
    : MONEY_DIRECTIONS.RECEIVE; // کسری/عیب را از تامین‌کننده پس می‌گیریم

  const method = pickRandom([
    PAYMENT_METHODS.CASH,
    PAYMENT_METHODS.TRANSFER,
    PAYMENT_METHODS.ON_ACCOUNT,
  ]);

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

// ─── ساخت مرجوعی از روی یک خرید ─────────────────────────────────────────────

const SEED_TARGETS = [
  PURCHASE_RETURN_STATUSES.OPEN,
  PURCHASE_RETURN_STATUSES.IN_PROGRESS,
  PURCHASE_RETURN_STATUSES.SETTLED,
  PURCHASE_RETURN_STATUSES.SETTLED,
  PURCHASE_RETURN_STATUSES.REJECTED,
  PURCHASE_RETURN_STATUSES.CANCELLED,
];

function buildReturnFromPurchase(purchase, index) {
  const target = SEED_TARGETS[index % SEED_TARGETS.length];
  const isExplicitlyClosed =
    target === PURCHASE_RETURN_STATUSES.REJECTED ||
    target === PURCHASE_RETURN_STATUSES.CANCELLED;

  const pickedItems = [...purchase.items]
    .sort(() => 0.5 - Math.random())
    .slice(0, Math.min(purchase.items.length, randomInt(1, 2)));

  const claims = pickedItems.map((item) => {
    const claim = buildClaim({
      purchaseItem: item,
      qty: Math.max(1, Math.min(item.qty, randomInt(1, 4))),
      problem: pickRandom(ON_ORDER_PROBLEMS),
      scope: CLAIM_SCOPES.ON_ORDER,
    });
    if (!isExplicitlyClosed) seedResolutions(claim, target);
    return claim;
  });

  // هر چند مرجوعی، یک ادعای «خارج از سفارش» هم می‌گیرد — قرینه‌ی
  // مازادِ نسخه‌ی قبلی، حالا فقط یک دامنه‌ی متفاوت.
  if (index % 3 === 1) {
    const claim = buildClaim({
      purchaseItem: pickedItems[0],
      qty: randomInt(1, 3),
      problem: PURCHASE_RETURN_PROBLEMS.OVER_SHIPPED,
      scope: CLAIM_SCOPES.OFF_ORDER,
      offScopeKind: OFF_ORDER_KINDS.EXCESS,
    });
    if (!isExplicitlyClosed) seedResolutions(claim, target);
    claims.push(claim);
  }

  const createdDate = new Date(purchase.createdAt);
  createdDate.setDate(createdDate.getDate() + randomInt(3, 20));

  const record = {
    id: index + 1,
    returnNumber: `PRET-2026-${String(index + 1).padStart(3, "0")}`,
    purchaseId: purchase.id,
    purchaseInvoiceNumber: purchase.invoiceNumber,
    supplierId: purchase.supplierId,
    supplierName: purchase.supplierName,
    returnDate: formatDate(createdDate),
    status: isExplicitlyClosed ? target : PURCHASE_RETURN_STATUSES.OPEN,
    description: "",
    previousReturnId: null,
    claims,
    totalClaimedAmount: claims.reduce((s, c) => s + c.qty * c.unitPrice, 0),
    createdAt: createdDate.toISOString(),
    updatedAt: createdDate.toISOString(),
  };

  if (target === PURCHASE_RETURN_STATUSES.SETTLED) markAllGoodsEffectsDone(record);

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

const seedEligiblePurchases = allPurchases.filter((p) =>
  RETURN_ELIGIBLE_PURCHASE_STATUSES.includes(p.status),
);

export const purchaseReturnsMock = seedEligiblePurchases
  .slice(0, 8)
  .map((purchase, idx) => buildReturnFromPurchase(purchase, idx));

export const allPurchaseReturns = [...purchaseReturnsMock];
