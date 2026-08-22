import {
  allPurchaseReturns,
  RETURN_ELIGIBLE_PURCHASE_STATUSES,
} from "./mockData";
import { allPurchases } from "@/features/purchases/orders/services/mockData";
import { adjustPurchaseTotal } from "@/features/purchases/orders/services/api-mockData";
import { adjustProductsStock } from "@/features/warehouse/products/services/api-mockData";

import {
  CLAIM_SCOPES,
  PURCHASE_RETURN_STATUSES,
  isTerminalStatus,
} from "../domain/purchaseReturnVocabulary";
import {
  EFFECT_KINDS,
  EFFECT_STATUSES,
  affectsInvoiceTotal,
  isGoodsEffect,
} from "@/shared/domain/returns/effects";
import {
  buildResolution,
  claimRemainingQty,
  deriveReturnStatus,
  validateComposition,
} from "@/shared/domain/returns/resolutions";

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

const ACTIVE_RETURN_STATUSES = new Set([
  PURCHASE_RETURN_STATUSES.OPEN,
  PURCHASE_RETURN_STATUSES.IN_PROGRESS,
  PURCHASE_RETURN_STATUSES.SETTLED,
]);

function getPurchase(purchaseId) {
  return allPurchases.find((p) => Number(p.id) === Number(purchaseId));
}

export function getPurchaseReturnIndex(returnId) {
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

/**
 * چقدر از یک کالا در مرجوعی‌های *فعالِ دیگرِ* همین خرید ادعا شده.
 *
 * مثل سمت فروش، فقط برای *نمایش* است و سقف فرم را تعیین نمی‌کند: واحد
 * خرید باید بتواند برای کل مقدار سفارش ادعا ثبت کند.
 */
function activeClaimedQtyForProduct(purchaseId, productId, excludeReturnId = null) {
  let claimed = 0;

  allPurchaseReturns.forEach((ret) => {
    if (Number(ret.purchaseId) !== Number(purchaseId)) return;
    if (excludeReturnId != null && Number(ret.id) === Number(excludeReturnId)) return;
    if (!ACTIVE_RETURN_STATUSES.has(ret.status)) return;

    (ret.claims || []).forEach((claim) => {
      if (claim.scope !== CLAIM_SCOPES.ON_ORDER) return;
      if (claim.productId !== productId) return;
      claimed += Number(claim.qty) || 0;

      // کالای جایگزینی که تامین‌کننده دوباره فرستاده و رسیده، ادعای
      // بازِ معلق نیست — نمونه‌ی تازه‌ای پیش ماست.
      (claim.resolutions || []).forEach((res) =>
        (res.effects || []).forEach((effect) => {
          if (effect.kind !== EFFECT_KINDS.GOODS_IN) return;
          if (effect.productId !== productId) return;
          claimed -= Number(effect.doneQty) || 0;
        }),
      );
    });
  });

  return Math.max(0, claimed);
}

/** سقف ادعا برای یک قلم = مقدار سفارش‌شده. */
export function computeItemClaimableQty(item) {
  return Math.max(0, Number(item.qty) || 0);
}

// ─── خواندن ─────────────────────────────────────────────────────────────────

export async function fetchReturnablePurchases(search = "") {
  await delay(350);

  let filtered = allPurchases.filter((p) =>
    RETURN_ELIGIBLE_PURCHASE_STATUSES.includes(p.status),
  );

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
  if (!RETURN_ELIGIBLE_PURCHASE_STATUSES.includes(purchase.status)) {
    throw new Error("هنوز چیزی از این خرید دریافت نشده و قابل مرجوع‌کردن نیست");
  }

  return {
    purchaseId: purchase.id,
    purchaseUpdatedAt: purchase.updatedAt,
    invoiceNumber: purchase.invoiceNumber,
    invoiceDate: purchase.invoiceDate,
    supplierId: purchase.supplierId,
    supplierName: purchase.supplierName,
    items: purchase.items.map((item) => ({
      ...item,
      deliveredQty: item.receivedQty ?? 0,
      claimableQty: computeItemClaimableQty(item),
      activeClaimedQty: activeClaimedQtyForProduct(
        purchase.id,
        item.productId,
        excludeReturnId,
      ),
    })),
  };
}

export async function fetchPurchaseReturns(params = {}) {
  await delay(500);

  const {
    page = 1,
    limit = 10,
    search = "",
    supplierIds = [],
    status = "",
    problem = "",
    scope = "",
    fromDate = "",
    toDate = "",
    sortBy = "createdAt",
    sortOrder = "desc",
  } = params;

  let filtered = [...allPurchaseReturns];

  if (search) {
    const term = search.toLowerCase();
    filtered = filtered.filter(
      (r) =>
        (r.returnNumber && r.returnNumber.toLowerCase().includes(term)) ||
        r.purchaseInvoiceNumber.toLowerCase().includes(term) ||
        r.supplierName.toLowerCase().includes(term),
    );
  }
  if (Array.isArray(supplierIds) && supplierIds.length) {
    filtered = filtered.filter((r) =>
      supplierIds.map(String).includes(String(r.supplierId)),
    );
  }
  if (status) filtered = filtered.filter((r) => r.status === status);

  // مثل سمت فروش، این دو روی *ادعاها* می‌نشینند نه روی سند.
  if (problem) {
    filtered = filtered.filter((r) =>
      (r.claims || []).some((c) => c.problem === problem),
    );
  }
  if (scope) {
    filtered = filtered.filter((r) =>
      (r.claims || []).some((c) => c.scope === scope),
    );
  }

  if (fromDate) {
    filtered = filtered.filter(
      (r) => r.returnDate && r.returnDate.slice(0, 10) >= fromDate.slice(0, 10),
    );
  }
  if (toDate) {
    filtered = filtered.filter(
      (r) => r.returnDate && r.returnDate.slice(0, 10) <= toDate.slice(0, 10),
    );
  }

  filtered.sort((a, b) => {
    let aVal = a[sortBy];
    let bVal = b[sortBy];
    if (["createdAt", "updatedAt", "returnDate"].includes(sortBy)) {
      aVal = aVal ? new Date(aVal).getTime() : 0;
      bVal = bVal ? new Date(bVal).getTime() : 0;
    } else if (sortBy === "totalClaimedAmount") {
      aVal = Number(aVal) || 0;
      bVal = Number(bVal) || 0;
    } else if (typeof aVal === "string" || typeof bVal === "string") {
      aVal = aVal || "";
      bVal = bVal || "";
      return sortOrder === "asc"
        ? aVal.localeCompare(bVal, "fa")
        : bVal.localeCompare(aVal, "fa");
    }
    return sortOrder === "asc" ? (aVal > bVal ? 1 : -1) : aVal < bVal ? 1 : -1;
  });

  const total = filtered.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const start = (page - 1) * limit;

  return { items: filtered.slice(start, start + limit), total, page, totalPages };
}

export async function fetchPurchaseReturnById(id) {
  await delay(300);
  const item = allPurchaseReturns.find((r) => Number(r.id) === Number(id));
  if (!item) throw new Error("مرجوعی یافت نشد");
  return item;
}

// ─── ثبت ادعا ───────────────────────────────────────────────────────────────

export async function createPurchaseReturn(payload) {
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

export async function addClaimResolution(returnId, claimId, composition) {
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
 * rounds: [{ effectId, qty, healthyQty?, issueNote? }]
 *   healthyQty فقط برای GOODS_IN (دریافت کالای جایگزین از تامین‌کننده)
 *   معنا دارد.
 */
export async function executeGoodsRound(returnId, { rounds = [], ...logistics } = {}) {
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
        const healthyQty = isIn
          ? Math.max(0, Math.min(Number(entry.healthyQty ?? qty) || 0, qty))
          : qty;

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
              issueNote: entry.issueNote || "",
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
