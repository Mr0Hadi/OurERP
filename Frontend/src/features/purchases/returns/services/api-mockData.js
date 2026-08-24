import { allPurchaseReturns } from "./mockData";
import { allPurchases } from "@/features/purchases/orders/services/mockData";
import { adjustPurchaseTotal } from "@/features/purchases/orders/services/api-mockData";
import { adjustProductsStock } from "@/features/warehouse/products/services/api-mockData";
import { applyListQuery } from "@/shared/services/mockQuery";
import { runOnce } from "@/shared/services/mockIdempotency";

import {
  PURCHASE_RETURN_STATUSES,
  hasAnythingArrived,
  isTerminalStatus,
} from "../domain/purchaseReturnVocabulary";
import {
  EFFECT_KINDS,
  EFFECT_STATUSES,
  affectsInvoiceTotal,
  isGoodsEffect,
  normalizeObservations,
  observedQtyOf,
} from "@/shared/domain/returns/effects";
import {
  buildResolution,
  claimRemainingQty,
  deriveReturnStatus,
  validateComposition,
} from "@/shared/domain/returns/resolutions";
import {
  claimBreakdown,
  deliveredAdjustment,
  relatedReturnsSummary,
  returnsOfOrder,
} from "@/shared/domain/returns/orderContext";

/**
 * لایه‌ی داده‌ی مرجوعی خرید + موتور اثر — قرینه‌ی دقیقِ سمت فروش.
 *
 * تنها جایی که اثرهای مرجوعی خرید به دنیای بیرون وصل می‌شوند: موجودی
 * کالا و مبلغ خرید.
 *
 *  • اثرهای پولی لحظه‌ی ثبتِ تصمیم اعمال می‌شوند.
 *  • اثرهای کالایی معلق می‌مانند تا انبار واقعاً کالا را جابه‌جا کند،
 *    و می‌توانند چند دور جزئی داشته باشند.
 */

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const generateId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

function getPurchase(purchaseId) {
  return allPurchases.find((p) => Number(p.id) === Number(purchaseId));
}

function getPurchaseReturnIndex(returnId) {
  return allPurchaseReturns.findIndex((r) => Number(r.id) === Number(returnId));
}

function findReturn(returnId) {
  const idx = getPurchaseReturnIndex(returnId);
  if (idx === -1) throw new Error("مرجوعی یافت نشد");
  return { idx, ret: allPurchaseReturns[idx] };
}

function allEffects(ret) {
  return (ret.claims || []).flatMap((claim) =>
    (claim.resolutions || []).flatMap((res) => res.effects || []),
  );
}

/** بازنویسی رکورد با وضعیت مشتق‌شده — تنها راه نوشتن روی یک مرجوعی. */
function commit(idx, patch) {
  const next = {
    ...allPurchaseReturns[idx],
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  next.totalClaimedAmount = (next.claims || []).reduce(
    (sum, claim) =>
      sum + (Number(claim.qty) || 0) * (Number(claim.unitPrice) || 0),
    0,
  );
  next.status = deriveReturnStatus(next);
  allPurchaseReturns[idx] = next;
  return next;
}

// ─── سهمیه‌ی قابل‌ادعا روی یک خط خرید ───────────────────────────────────────

/** سقف ادعا برای یک قلم = مقدار سفارش‌شده. */
function computeItemClaimableQty(item) {
  return Math.max(0, Number(item.qty) || 0);
}

// ─── خواندن ─────────────────────────────────────────────────────────────────

export async function fetchReturnablePurchases(search = "") {
  await delay(350);

  let filtered = allPurchases.filter(hasAnythingArrived);

  if (search) {
    const term = search.toLowerCase();
    filtered = filtered.filter(
      (purchase) =>
        purchase.invoiceNumber.toLowerCase().includes(term) ||
        purchase.supplierName.toLowerCase().includes(term),
    );
  }

  filtered.sort((a, b) => new Date(b.invoiceDate) - new Date(a.invoiceDate));

  return filtered.slice(0, 30).map((purchase) => ({
    id: purchase.id,
    invoiceNumber: purchase.invoiceNumber,
    invoiceDate: purchase.invoiceDate,
    supplierId: purchase.supplierId,
    supplierName: purchase.supplierName,
    status: purchase.status,
    totalAmount: purchase.totalAmount,
    itemsCount: (purchase.items || []).length,
  }));
}

/**
 * اطلاعات لازم برای فرم ثبت ادعا.
 *
 * برخلاف نسخه‌ی قبلی هیچ گزارش مغایرتی لازم نیست — هر خریدی که چیزی
 * از آن رسیده باشد قابل ادعاست، دقیقاً مثل سمت فروش.
 */
export async function fetchPurchaseForReturn(purchaseId, excludeReturnId = null) {
  await delay(300);

  const purchase = getPurchase(purchaseId);
  if (!purchase) throw new Error("خرید یافت نشد");
  if (!hasAnythingArrived(purchase)) {
    throw new Error("هنوز چیزی از این خرید دریافت نشده و قابل مرجوع‌کردن نیست");
  }

  const siblings = returnsOfOrder(allPurchaseReturns, "purchaseId", purchase.id);

  return {
    purchaseId: purchase.id,
    purchaseUpdatedAt: purchase.updatedAt,
    invoiceNumber: purchase.invoiceNumber,
    invoiceDate: purchase.invoiceDate,
    supplierId: purchase.supplierId,
    supplierName: purchase.supplierName,
    items: purchase.items.map((item) => {
      // قرینه‌ی سمت فروش: تطبیق با شناسه‌ی خط سفارش، نه با کالا.
      const line = { orderLineId: item.id, productId: item.productId };
      const claimed = claimBreakdown(siblings, line, excludeReturnId);
      return {
        ...item,
        orderLineId: item.id,
        // با هر دورِ رسیدنِ کالای جایگزین به‌روز می‌شود، نه فقط با
        // دریافتِ خودِ سفارش.
        deliveredQty:
          (item.receivedQty ?? 0) +
          deliveredAdjustment(siblings, line, { side: "purchase" }),
        // نامِ این فیلد عمداً با سمت فروش یکی است: هر دو «سقف ادعا
        // روی این خط» را می‌گویند و فرمِ مشترک نباید بداند کدام سمت
        // است.
        returnableQty: computeItemClaimableQty(item),
        claimedHereQty: claimed.here,
        activeClaimedQty: claimed.elsewhere,
      };
    }),
    relatedReturns: relatedReturnsSummary(siblings, excludeReturnId),
  };
}

export async function fetchPurchaseReturns(params = {}) {
  await delay(500);

  const { supplierIds = [], status = "", problem = "", scope = "" } = params;

  let filtered = [...allPurchaseReturns];

  if (Array.isArray(supplierIds) && supplierIds.length) {
    filtered = filtered.filter((r) =>
      supplierIds.map(String).includes(String(r.supplierId)),
    );
  }
  // enum عددی است و OPEN صفر — پس «انتخاب‌نشده» فقط رشته‌ی خالی است.
  if (status !== "" && status !== undefined) {
    filtered = filtered.filter((r) => r.status === status);
  }

  // مثل سمت فروش، این دو روی *ادعاها* می‌نشینند نه روی سند.
  if (problem !== "" && problem !== undefined) {
    filtered = filtered.filter((r) =>
      (r.claims || []).some((c) => c.problem === problem),
    );
  }
  if (scope !== "" && scope !== undefined) {
    filtered = filtered.filter((r) =>
      (r.claims || []).some((c) => c.scope === scope),
    );
  }

  return applyListQuery(filtered, params, {
    searchFields: ["returnNumber", "purchaseInvoiceNumber", "supplierName"],
    dateField: "returnDate",
    numericFields: ["totalClaimedAmount"],
  });
}

export async function fetchPurchaseReturnById(id) {
  await delay(300);
  const item = allPurchaseReturns.find((r) => Number(r.id) === Number(id));
  if (!item) throw new Error("مرجوعی یافت نشد");
  return item;
}

// ─── ثبت ادعا ───────────────────────────────────────────────────────────────

export async function createPurchaseReturn(payload, { idempotencyKey } = {}) {
  return runOnce(idempotencyKey, () => createPurchaseReturnOnce(payload));
}

async function createPurchaseReturnOnce(payload) {
  await delay(700);

  const newId = allPurchaseReturns.length
    ? Math.max(...allPurchaseReturns.map((r) => Number(r.id) || 0)) + 1
    : 1;

  const claims = (payload.claims || []).map((claim) => ({
    ...claim,
    id: claim.id || generateId(),
    resolutions: [],
    createdAt: new Date().toISOString(),
  }));

  if (claims.length === 0) throw new Error("حداقل یک ادعا باید ثبت شود");

  const newReturn = {
    ...payload,
    id: newId,
    returnNumber: `PRET-2026-${String(newId).padStart(3, "0")}`,
    status: PURCHASE_RETURN_STATUSES.OPEN,
    previousReturnId: payload.previousReturnId ?? null,
    claims,
    totalClaimedAmount: claims.reduce(
      (sum, c) => sum + (Number(c.qty) || 0) * (Number(c.unitPrice) || 0),
      0,
    ),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  allPurchaseReturns.unshift(newReturn);
  return newReturn;
}

// ─── اعمال اثر روی دنیای بیرون ──────────────────────────────────────────────

/**
 * جهتِ پول از دید خرید: MONEY_IN یعنی تامین‌کننده پول برمی‌گرداند، پس
 * بدهیِ ما به او *کم* می‌شود. MONEY_OUT برعکس — بابت کالای اضافه‌ای که
 * نگه داشته‌ایم می‌پردازیم و جمع خرید بالا می‌رود.
 *
 * این دقیقاً قرینه‌ی سمت فروش است: آنجا MONEY_IN طلبِ ما را زیاد
 * می‌کرد، اینجا بدهیِ ما را کم می‌کند.
 */
function purchaseDeltaOf(effect) {
  if (!affectsInvoiceTotal(effect.method)) return 0;
  if (effect.kind === EFFECT_KINDS.MONEY_IN) return -(Number(effect.amount) || 0);
  if (effect.kind === EFFECT_KINDS.MONEY_OUT) return Number(effect.amount) || 0;
  return 0;
}

async function applyMoneyEffects(purchaseId, effects, { reverse = false } = {}) {
  const delta = effects.reduce((sum, e) => sum + purchaseDeltaOf(e), 0);
  if (!delta) return;
  await adjustPurchaseTotal(purchaseId, reverse ? -delta : delta);
}

// ─── ثبت و حذف تصمیم ────────────────────────────────────────────────────────

export async function addClaimResolution(
  returnId,
  claimId,
  composition,
  { idempotencyKey } = {},
) {
  return runOnce(idempotencyKey, () =>
    addClaimResolutionOnce(returnId, claimId, composition),
  );
}

async function addClaimResolutionOnce(returnId, claimId, composition) {
  await delay(500);

  const { idx, ret } = findReturn(returnId);
  if (isTerminalStatus(ret.status)) {
    throw new Error("این مرجوعی دیگر قابل ویرایش نیست");
  }

  const claim = (ret.claims || []).find((c) => c.id === claimId);
  if (!claim) throw new Error("ادعا یافت نشد");

  const errors = validateComposition(composition, claim, {
    remainingQty: claimRemainingQty(claim),
  });
  if (errors.length) throw new Error(errors[0]);

  const resolution = buildResolution(composition, claim);

  await applyMoneyEffects(
    ret.purchaseId,
    resolution.effects.filter((e) => !isGoodsEffect(e.kind)),
  );

  const claims = ret.claims.map((c) =>
    c.id === claimId
      ? { ...c, resolutions: [...(c.resolutions || []), resolution] }
      : c,
  );

  return commit(idx, { claims });
}

/**
 * حذف یک تصمیم. تا وقتی هیچ کالایی جابه‌جا نشده برگشت‌پذیر است و
 * اثرهای پولی‌اش با یک تعدیل معکوس خنثی می‌شوند.
 */
export async function removeClaimResolution(returnId, claimId, resolutionId) {
  await delay(400);

  const { idx, ret } = findReturn(returnId);

  const claim = (ret.claims || []).find((c) => c.id === claimId);
  if (!claim) throw new Error("ادعا یافت نشد");

  const resolution = (claim.resolutions || []).find((r) => r.id === resolutionId);
  if (!resolution) throw new Error("تصمیم یافت نشد");

  const movedGoods = (resolution.effects || []).some(
    (effect) => isGoodsEffect(effect.kind) && (Number(effect.doneQty) || 0) > 0,
  );
  if (movedGoods) {
    throw new Error("بخشی از کالای این تصمیم جابه‌جا شده و دیگر قابل لغو نیست");
  }

  const moneyEffects = (resolution.effects || []).filter(
    (effect) =>
      !isGoodsEffect(effect.kind) && effect.status === EFFECT_STATUSES.APPLIED,
  );

  await applyMoneyEffects(ret.purchaseId, moneyEffects, { reverse: true });

  const claims = ret.claims.map((c) =>
    c.id === claimId
      ? {
          ...c,
          resolutions: (c.resolutions || []).filter((r) => r.id !== resolutionId),
        }
      : c,
  );

  return commit(idx, { claims });
}

// ─── اجرای اثرهای کالایی توسط انبار ─────────────────────────────────────────

/**
 * ثبت یک «دور» جابه‌جایی فیزیکی کالا — همان قرارداد تجمعیِ سمت فروش.
 *
 * rounds: [{ effectId, qty, observations? }]
 *   observations = [{ problem, qty, note }] و فقط برای GOODS_IN
 *   (دریافت کالای جایگزین از تامین‌کننده) معنا دارد؛ وقتی *ما*
 *   می‌فرستیم چیزی برای بازرسی وجود ندارد.
 */
export async function executeGoodsRound(returnId, payload = {}, { idempotencyKey } = {}) {
  return runOnce(idempotencyKey, () => executeGoodsRoundOnce(returnId, payload));
}

async function executeGoodsRoundOnce(returnId, { rounds = [], ...logistics } = {}) {
  await delay(500);

  const { idx, ret } = findReturn(returnId);
  if (isTerminalStatus(ret.status)) {
    throw new Error("این مرجوعی دیگر قابل ویرایش نیست");
  }
  if (rounds.length === 0) {
    throw new Error("هیچ کالایی برای ثبت انتخاب نشده است");
  }

  const date = logistics.date || new Date().toISOString().slice(0, 10);
  const stockDeltas = [];
  let touched = 0;

  const claims = (ret.claims || []).map((claim) => ({
    ...claim,
    resolutions: (claim.resolutions || []).map((res) => ({
      ...res,
      effects: (res.effects || []).map((effect) => {
        const entry = rounds.find((r) => r.effectId === effect.id);
        if (!entry) return effect;
        if (!isGoodsEffect(effect.kind)) return effect;
        if (effect.status !== EFFECT_STATUSES.PENDING) return effect;

        const remaining = (Number(effect.qty) || 0) - (Number(effect.doneQty) || 0);
        const qty = Math.max(0, Math.min(Number(entry.qty) || 0, remaining));
        if (qty <= 0) return effect;

        const isIn = effect.kind === EFFECT_KINDS.GOODS_IN;
        // مقدارِ سالم از روی مشاهده‌ها مشتق می‌شود، نه به‌عنوان یک عددِ
        // جدا: انباردار «چه چیزی دیدم» را ثبت می‌کند و «چقدرش سالم
        // بود» نتیجه‌ی همان است. دو ورودیِ مستقل یعنی دو عددی که
        // می‌توانند با هم نخوانند.
        const observations = normalizeObservations(entry.observations);
        const observedQty = Math.min(observedQtyOf(observations), qty);
        const healthyQty = isIn ? Math.max(0, qty - observedQty) : qty;

        touched += 1;
        if (effect.productId != null) {
          const delta = isIn ? healthyQty : -qty;
          if (delta !== 0) stockDeltas.push({ productId: effect.productId, delta });
        }

        const doneQty = (Number(effect.doneQty) || 0) + qty;
        const isComplete = doneQty >= (Number(effect.qty) || 0);

        return {
          ...effect,
          doneQty,
          restockedQty: isIn
            ? (Number(effect.restockedQty) || 0) + healthyQty
            : effect.restockedQty,
          status: isComplete ? EFFECT_STATUSES.APPLIED : EFFECT_STATUSES.PENDING,
          appliedAt: isComplete ? new Date().toISOString() : null,
          history: [
            ...(effect.history || []),
            {
              id: generateId(),
              date,
              qty,
              healthyQty: isIn ? healthyQty : null,
              // مشاهده‌ی مستقل انبار: ممکن است با آنچه طرف حساب ادعا
              // کرده فرق داشته باشد (مشتری گفته «معیوب»، انبار می‌بیند
              // «آسیب در حمل»). هر دو نگه داشته می‌شوند چون هرکدام یک
              // مقصر متفاوت را نشان می‌دهند.
              observations: isIn ? observations : [],
              partyName: logistics.partyName || "",
              partyNationalId: logistics.partyNationalId || "",
              vehiclePlate: logistics.vehiclePlate || "",
              note: logistics.note || "",
            },
          ],
        };
      }),
    })),
  }));

  if (touched === 0) throw new Error("هیچ اثری برای ثبت این دور پیدا نشد");

  const updated = commit(idx, { claims });
  adjustProductsStock(stockDeltas);

  return updated;
}

// ─── چرخه‌ی عمر ─────────────────────────────────────────────────────────────

function assertUntouched(ret, action) {
  const applied = allEffects(ret).some(
    (effect) => effect.status === EFFECT_STATUSES.APPLIED,
  );
  if (applied) {
    throw new Error(
      `این مرجوعی قبلاً اثری روی موجودی یا مبلغ خرید گذاشته و دیگر قابل ${action} نیست`,
    );
  }
}

export async function rejectPurchaseReturn(id) {
  await delay(300);
  const { idx, ret } = findReturn(id);
  assertUntouched(ret, "رد کردن");
  allPurchaseReturns[idx] = {
    ...ret,
    status: PURCHASE_RETURN_STATUSES.REJECTED,
    updatedAt: new Date().toISOString(),
  };
  return allPurchaseReturns[idx];
}

export async function cancelPurchaseReturn(id) {
  await delay(300);
  const { idx, ret } = findReturn(id);
  assertUntouched(ret, "لغو کردن");
  allPurchaseReturns[idx] = {
    ...ret,
    status: PURCHASE_RETURN_STATUSES.CANCELLED,
    updatedAt: new Date().toISOString(),
  };
  return allPurchaseReturns[idx];
}

export async function reopenPurchaseReturn(id) {
  await delay(300);
  const { idx, ret } = findReturn(id);
  if (!isTerminalStatus(ret.status)) return ret;
  return commit(idx, { status: PURCHASE_RETURN_STATUSES.OPEN });
}

export async function removePurchaseReturn(id) {
  await delay(500);
  const { idx, ret } = findReturn(id);
  assertUntouched(ret, "حذف");
  return allPurchaseReturns.splice(idx, 1)[0];
}
