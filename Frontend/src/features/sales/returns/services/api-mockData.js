import { allSalesReturns, RETURN_ELIGIBLE_SALE_STATUSES } from "./mockData";
import { allSales } from "@/features/sales/orders/services/mockData";
import { adjustSaleTotal } from "@/features/sales/orders/services/api-mockData";
import { adjustProductsStock } from "@/features/warehouse/products/services/api-mockData";
import { applyListQuery } from "@/shared/services/mockQuery";
import { runOnce } from "@/shared/services/mockIdempotency";

import {
  SALES_RETURN_STATUSES,
  isTerminalStatus,
} from "../domain/returnVocabulary";
import {
  EFFECT_KINDS,
  EFFECT_STATUSES,
  affectsInvoiceTotal,
  isGoodsEffect,
  normalizeObservations,
  observedQuantityOf,
} from "@/shared/domain/returns/effects";
import {
  buildResolution,
  claimRemainingQuantity,
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
 * لایه‌ی داده‌ی مرجوعی فروش + موتور اثر.
 *
 * «موتور اثر» یعنی تنها جایی که اثرهای مرجوعی به دنیای بیرون وصل
 * می‌شوند: موجودی کالا و مبلغ فروش. هیچ‌جای دیگری اجازه ندارد این دو
 * را از طرف مرجوعی تغییر دهد، تا حساب همیشه از یک مسیر بگذرد.
 *
 * دو قانونِ اجرای اثر:
 *
 *  • اثرهای پولی لحظه‌ی ثبتِ تصمیم اعمال می‌شوند (ثبتشان توسط واحد
 *    فروش خودش همان اقدام مالی است).
 *  • اثرهای کالایی معلق می‌مانند تا انبار واقعاً کالا را جابه‌جا کند،
 *    و می‌توانند چند دور جزئی داشته باشند.
 */

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const generateId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

function getSale(saleId) {
  return allSales.find((s) => Number(s.id) === Number(saleId));
}

function getSalesReturnIndex(returnId) {
  return allSalesReturns.findIndex((r) => Number(r.id) === Number(returnId));
}

function findReturn(returnId) {
  const idx = getSalesReturnIndex(returnId);
  if (idx === -1) throw new Error("مرجوعی یافت نشد");
  return { idx, ret: allSalesReturns[idx] };
}

function allEffects(ret) {
  return (ret.claims || []).flatMap((claim) =>
    (claim.resolutions || []).flatMap((res) => res.effects || []),
  );
}

/** بازنویسی رکورد با وضعیت مشتق‌شده — تنها راه نوشتن روی یک مرجوعی. */
function commit(idx, patch) {
  const next = {
    ...allSalesReturns[idx],
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  next.totalClaimedAmount = (next.claims || []).reduce(
    (sum, claim) => sum + (Number(claim.quantity) || 0) * (Number(claim.unitPrice) || 0),
    0,
  );
  next.status = deriveReturnStatus(next);
  allSalesReturns[idx] = next;
  return next;
}

// ─── سهمیه‌ی قابل‌ادعا روی یک خط فروش ───────────────────────────────────────

/**
 * سقف ادعا برای یک قلم = هر چه واقعاً به مشتری تحویل شده.
 *
 * عمداً چیزی از آن کم نمی‌شود: واحد فروش باید بتواند برای کل مقدار
 * تحویل‌شده ادعا ثبت کند. اگر مشتری دوباره تماس بگیرد و بگوید همان
 * کالا مشکل دیگری هم دارد، سقفِ محاسبه‌شده نباید جلویش را بگیرد —
 * تصمیم اینکه ادعا معتبر است یا نه با واحد فروش است، نه با یک فرمول.
 */
function computeItemReturnableQuantity(item) {
  return Math.max(0, item.shippedQuantity ?? item.quantity);
}

// ─── خواندن ─────────────────────────────────────────────────────────────────

export async function fetchReturnableSales(search = "") {
  await delay(350);

  let filtered = allSales.filter((s) =>
    RETURN_ELIGIBLE_SALE_STATUSES.includes(s.status),
  );

  if (search) {
    const term = search.toLowerCase();
    filtered = filtered.filter(
      (sale) =>
        sale.invoiceNumber.toLowerCase().includes(term) ||
        sale.customerName.toLowerCase().includes(term),
    );
  }

  filtered.sort((a, b) => new Date(b.invoiceDate) - new Date(a.invoiceDate));

  return filtered.slice(0, 30).map((sale) => ({
    id: sale.id,
    invoiceNumber: sale.invoiceNumber,
    invoiceDate: sale.invoiceDate,
    customerId: sale.customerId,
    customerName: sale.customerName,
    status: sale.status,
    totalAmount: sale.totalAmount,
  }));
}

/**
 * اطلاعات لازم برای فرم ثبت ادعا.
 *
 * برخلاف نسخه‌ی قبلی، اقلامی که سهمیه‌شان تمام شده هم برگردانده
 * می‌شوند (با returnableQuantity صفر). دلیلش این است که یک ادعای «خارج از
 * فاکتور» می‌تواند روی همان کالا ثبت شود حتی وقتی سهمیه‌ی روی فاکتور
 * صفر است — دقیقاً حالت اضافه‌ارسال.
 */
export async function fetchSaleForReturn(saleId, excludeReturnId = null) {
  await delay(300);

  const sale = getSale(saleId);
  if (!sale) throw new Error("فروش یافت نشد");
  if (!RETURN_ELIGIBLE_SALE_STATUSES.includes(sale.status)) {
    throw new Error("این فروش هنوز به مشتری تحویل نشده و قابل مرجوع‌کردن نیست");
  }

  const siblings = returnsOfOrder(allSalesReturns, "saleId", sale.id);

  return {
    saleId: sale.id,
    saleUpdatedAt: sale.updatedAt,
    invoiceNumber: sale.invoiceNumber,
    invoiceDate: sale.invoiceDate,
    customerId: sale.customerId,
    customerName: sale.customerName,
    items: sale.items.map((item) => {
      // خط با شناسه‌ی خودش شناخته می‌شود نه با کالا؛ اگر یک کالا در دو
      // خط فاکتور باشد، سهمیه‌ی هر خط جداست.
      const line = { orderLineId: item.id, productId: item.productId };
      const claimed = claimBreakdown(siblings, line, excludeReturnId);
      return {
        ...item,
        orderLineId: item.id,
        // آنچه *الان* دست مشتری است: پس‌گرفته‌ها کم و جایگزین‌های
        // ارسال‌شده اضافه می‌شوند.
        deliveredQuantity:
          (item.shippedQuantity ?? item.quantity) +
          deliveredAdjustment(siblings, line, { side: "sales" }),
        returnableQuantity: computeItemReturnableQuantity(item),
        claimedHereQuantity: claimed.here,
        // فقط برای اطلاع کاربر — سقف نیست.
        activeClaimedQuantity: claimed.elsewhere,
      };
    }),
    relatedReturns: relatedReturnsSummary(siblings, excludeReturnId),
  };
}

export async function fetchSalesReturns(params = {}) {
  await delay(500);

  const { customerId = "", status = "", problem = "", scope = "" } = params;

  let filtered = [...allSalesReturns];

  if (customerId !== "" && customerId != null) {
    filtered = filtered.filter(
      (r) => String(r.customerId) === String(customerId),
    );
  }
  // enum عددی است و OPEN صفر — پس «انتخاب‌نشده» فقط رشته‌ی خالی است.
  if (status !== "" && status !== undefined) {
    filtered = filtered.filter((r) => r.status === status);
  }

  // فیلترهای مشکل/دامنه روی *ادعاها* می‌نشینند نه روی سند، چون
  // یک مرجوعی می‌تواند چند ادعا با مشکل‌ها و مقصرهای مختلف داشته باشد.
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
    searchFields: ["returnNumber", "saleInvoiceNumber", "customerName"],
    dateField: "returnDate",
    numericFields: ["totalClaimedAmount"],
  });
}

export async function fetchSalesReturnById(id) {
  await delay(300);
  const item = allSalesReturns.find((r) => Number(r.id) === Number(id));
  if (!item) throw new Error("مرجوعی یافت نشد");
  return item;
}

// ─── ثبت ادعا ───────────────────────────────────────────────────────────────

export async function createSalesReturn(payload, { idempotencyKey } = {}) {
  return runOnce(idempotencyKey, () => createSalesReturnOnce(payload));
}

async function createSalesReturnOnce(payload) {
  await delay(700);

  const newId = allSalesReturns.length
    ? Math.max(...allSalesReturns.map((r) => Number(r.id) || 0)) + 1
    : 1;

  const claims = (payload.claims || []).map((claim) => ({
    ...claim,
    id: claim.id || generateId(),
    resolutions: [],
    createdAt: new Date().toISOString(),
  }));

  if (claims.length === 0) {
    throw new Error("حداقل یک ادعا باید ثبت شود");
  }

  const newReturn = {
    ...payload,
    id: newId,
    returnNumber: `SRET-2026-${String(newId).padStart(3, "0")}`,
    status: SALES_RETURN_STATUSES.OPEN,
    previousReturnId: payload.previousReturnId ?? null,
    sourceEffectId: payload.sourceEffectId ?? null,
    claims,
    totalClaimedAmount: claims.reduce(
      (sum, c) => sum + (Number(c.quantity) || 0) * (Number(c.unitPrice) || 0),
      0,
    ),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  allSalesReturns.unshift(newReturn);
  return newReturn;
}

// ─── اعمال اثر روی دنیای بیرون ──────────────────────────────────────────────

/**
 * جهتِ پول از دید فروش: MONEY_IN یعنی طلب ما از مشتری بیشتر می‌شود،
 * MONEY_OUT یعنی کمتر.
 *
 * اعتبار خرید بعدی عمداً روی فاکتور اثر نمی‌گذارد — یک تعهد برای
 * فروشِ *بعدی* است، نه تغییری در ارزش این فاکتور. همان رفتاری که
 * CREDIT در مرجوعی خرید دارد.
 */
function saleDeltaOf(effect) {
  if (!affectsInvoiceTotal(effect.method)) return 0;
  if (effect.kind === EFFECT_KINDS.MONEY_IN) return Number(effect.amount) || 0;
  if (effect.kind === EFFECT_KINDS.MONEY_OUT) return -(Number(effect.amount) || 0);
  return 0;
}

async function applyMoneyEffects(saleId, effects, { reverse = false } = {}) {
  const delta = effects.reduce((sum, effect) => sum + saleDeltaOf(effect), 0);
  if (!delta) return;
  await adjustSaleTotal(saleId, reverse ? -delta : delta);
}

// ─── ثبت و حذف تصمیم ────────────────────────────────────────────────────────

/**
 * ثبت یک تصمیم برای بخشی از یک ادعا.
 *
 * اعتبارسنجی از همان تابعی می‌آید که فرم استفاده می‌کند
 * (validateComposition) تا پیام‌ها دو جا نوشته نشوند و رفتار UI و
 * سرور از هم جدا نیفتد.
 */
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
    remainingQuantity: claimRemainingQuantity(claim),
  });
  if (errors.length) throw new Error(errors[0]);

  const resolution = buildResolution(composition, claim);

  // اثرهای پولی همان لحظه اعمال می‌شوند؛ اثرهای کالایی منتظر انبارند.
  // پیش از commit انجام می‌شود تا اگر فروش پیدا نشد، مرجوعی با تصمیمی
  // که هرگز روی فاکتور ننشسته باقی نماند.
  await applyMoneyEffects(
    ret.saleId,
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
 * حذف یک تصمیم.
 *
 * قانون: تا وقتی هیچ کالایی فیزیکاً جابه‌جا نشده، تصمیم قابل برگشت
 * است — و اثرهای پولی‌اش با یک تعدیل معکوس روی فاکتور خنثی می‌شوند.
 *
 * این با سمت خرید فرق دارد، که هر تصمیمِ پولی را برای همیشه قطعی
 * می‌داند. دلیل تفاوت: در مدل جدید تقریباً هر تصمیمی یک اثر پولیِ
 * فوری دارد، پس قطعی‌بودنِ بی‌قید یعنی یک اشتباه تایپی در مبلغ برای
 * همیشه در فاکتور می‌ماند. جابه‌جایی کالا اما برگشت‌پذیر نیست و
 * همان‌جا خط قرمز است.
 */
export async function removeClaimResolution(returnId, claimId, resolutionId) {
  await delay(400);

  const { idx, ret } = findReturn(returnId);

  const claim = (ret.claims || []).find((c) => c.id === claimId);
  if (!claim) throw new Error("ادعا یافت نشد");

  const resolution = (claim.resolutions || []).find((r) => r.id === resolutionId);
  if (!resolution) throw new Error("تصمیم یافت نشد");

  const movedGoods = (resolution.effects || []).some(
    (effect) => isGoodsEffect(effect.kind) && (Number(effect.doneQuantity) || 0) > 0,
  );
  if (movedGoods) {
    throw new Error("بخشی از کالای این تصمیم جابه‌جا شده و دیگر قابل لغو نیست");
  }

  const moneyEffects = (resolution.effects || []).filter(
    (effect) => !isGoodsEffect(effect.kind) && effect.status === EFFECT_STATUSES.APPLIED,
  );

  await applyMoneyEffects(ret.saleId, moneyEffects, { reverse: true });

  const claims = ret.claims.map((c) =>
    c.id === claimId
      ? { ...c, resolutions: (c.resolutions || []).filter((r) => r.id !== resolutionId) }
      : c,
  );

  return commit(idx, { claims });
}

// ─── اجرای اثرهای کالایی توسط انبار ─────────────────────────────────────────

/**
 * ثبت یک «دور» جابه‌جایی فیزیکی کالا برای چند اثر به‌طور هم‌زمان.
 *
 * همان قرارداد تجمعیِ قبلی، ولی حالا برای هر دو جهت با یک تابع:
 * هر اثر doneQuantity خودش را دارد و فقط وقتی به quantity کامل رسید APPLIED
 * می‌شود؛ تا آن موقع همان مرجوعی دوباره در صف انبار ظاهر می‌شود.
 *
 * rounds: [{ effectId, quantity, healthyQuantity? }]
 *   healthyQuantity فقط برای GOODS_IN معنا دارد — چقدر از کالای دریافتیِ
 *   همین دور سالم بوده. پیش‌فرضش کل quantity است؛ بقیه معیوب فرض می‌شود و
 *   وارد موجودی قابل‌فروش نمی‌شود (ولی ادعا را می‌بندد).
 *
 * logistics: اطلاعات حمل که روی تاریخچه‌ی همان دور ثبت می‌شود.
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

        const remaining = (Number(effect.quantity) || 0) - (Number(effect.doneQuantity) || 0);
        const quantity = Math.max(0, Math.min(Number(entry.quantity) || 0, remaining));
        if (quantity <= 0) return effect;

        const isIn = effect.kind === EFFECT_KINDS.GOODS_IN;
        // مقدارِ سالم از روی مشاهده‌ها مشتق می‌شود، نه به‌عنوان یک عددِ
        // جدا: انباردار «چه چیزی دیدم» را ثبت می‌کند و «چقدرش سالم
        // بود» نتیجه‌ی همان است. دو ورودیِ مستقل یعنی دو عددی که
        // می‌توانند با هم نخوانند.
        const observations = normalizeObservations(entry.observations);
        const observedQuantity = Math.min(observedQuantityOf(observations), quantity);
        const healthyQuantity = isIn ? Math.max(0, quantity - observedQuantity) : quantity;

        touched += 1;
        if (effect.productId != null) {
          // GOODS_IN فقط بخش سالم را به موجودی قابل‌فروش برمی‌گرداند؛
          // GOODS_OUT کل مقدارِ خارج‌شده را کم می‌کند.
          const delta = isIn ? healthyQuantity : -quantity;
          if (delta !== 0) stockDeltas.push({ productId: effect.productId, delta });
        }

        const doneQuantity = (Number(effect.doneQuantity) || 0) + quantity;
        const isComplete = doneQuantity >= (Number(effect.quantity) || 0);

        return {
          ...effect,
          doneQuantity,
          restockedQuantity: isIn
            ? (Number(effect.restockedQuantity) || 0) + healthyQuantity
            : effect.restockedQuantity,
          status: isComplete ? EFFECT_STATUSES.APPLIED : EFFECT_STATUSES.PENDING,
          appliedAt: isComplete ? new Date().toISOString() : null,
          history: [
            ...(effect.history || []),
            {
              id: generateId(),
              date,
              quantity,
              healthyQuantity: isIn ? healthyQuantity : null,
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

  if (touched === 0) {
    throw new Error("هیچ اثری برای ثبت این دور پیدا نشد");
  }

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
      `این مرجوعی قبلاً اثری روی موجودی یا مبلغ فروش گذاشته و دیگر قابل ${action} نیست`,
    );
  }
}

export async function rejectSalesReturn(id) {
  await delay(300);
  const { idx, ret } = findReturn(id);
  assertUntouched(ret, "رد کردن");
  allSalesReturns[idx] = {
    ...ret,
    status: SALES_RETURN_STATUSES.REJECTED,
    updatedAt: new Date().toISOString(),
  };
  return allSalesReturns[idx];
}

export async function cancelSalesReturn(id) {
  await delay(300);
  const { idx, ret } = findReturn(id);
  assertUntouched(ret, "لغو کردن");
  allSalesReturns[idx] = {
    ...ret,
    status: SALES_RETURN_STATUSES.CANCELLED,
    updatedAt: new Date().toISOString(),
  };
  return allSalesReturns[idx];
}

export async function reopenSalesReturn(id) {
  await delay(300);
  const { idx, ret } = findReturn(id);
  if (!isTerminalStatus(ret.status)) return ret;
  return commit(idx, { status: SALES_RETURN_STATUSES.OPEN });
}

export async function removeSalesReturn(id) {
  await delay(500);
  const { idx, ret } = findReturn(id);
  assertUntouched(ret, "حذف");
  return allSalesReturns.splice(idx, 1)[0];
}
