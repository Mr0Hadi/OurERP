// src/shared/domain/returns/resolutions.js

import {
  EFFECT_KINDS,
  EFFECT_STATUSES,
  PAYMENT_METHODS,
  SPLITTABLE_PAYMENT_METHODS,
  createEffect,
  observationsOf,
  summarizeEffects,
} from "./effects";
import { RETURN_STATUSES, isTerminalStatus } from "./statuses";

/**
 * تصمیم‌ها: ترکیب‌شان، بسطشان به اثر، اعتبارسنجی، و ماشین وضعیت —
 * مشترک بین مرجوعی فروش و مرجوعی خرید.
 *
 * یک تصمیم سه محور مستقل دارد که هرکدام می‌تواند باشد یا نباشد:
 *
 *   ۱. کالایی وارد انبار ما شود؟   (goodsIn)
 *   ۲. کالایی از انبار ما خارج شود؟ (goodsOut)
 *   ۳. پولی جابه‌جا شود؟           (money)
 *
 * محورها نسبت به *ما* نام‌گذاری شده‌اند، نه نسبت به طرف حساب. برای
 * همین یک مدل، هر دو سمت را پوشش می‌دهد و فقط برچسب‌ها فرق می‌کنند:
 *
 *   فروش:  goodsIn = پس‌گرفتن از مشتری   | goodsOut = ارسال برای مشتری
 *   خرید:  goodsIn = دریافت جایگزین      | goodsOut = عودت به تامین‌کننده
 *
 * برچسب‌ها در sides.js. اینجا هیچ متنی درباره‌ی «مشتری» یا
 * «تامین‌کننده» نیست.
 *
 * ساختار داده‌ای که این ماژول فرض می‌کند:
 *
 *   returnDoc
 *     └─ claims[]           ← ادعا (کالا + مشکل + تعداد)
 *          └─ resolutions[] ← تصمیم‌ها برای بخش‌هایی از آن تعداد
 *               └─ effects[]← اثرهای پایه (effects.js)
 */

const generateId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

const { GOODS_IN, GOODS_OUT, MONEY_IN, MONEY_OUT } = EFFECT_KINDS;

// ─── جهت پول ────────────────────────────────────────────────────────────────

/**
 * پول به کدام سمت می‌رود — نسبت به ما. RECEIVE یعنی پول به حساب ما
 * می‌آید و PAY یعنی از حساب ما می‌رود.
 */
// بدون معادل در بکند — محور داخلیِ فرمِ ترکیب تصمیم است.
export const MONEY_DIRECTIONS = {
  NONE: 0,
  RECEIVE: 1,
  PAY: 2,
};

/**
 * روش‌هایی که برای هر جهت معنا دارند. «اعتبار خرید بعدی» فقط وقتی
 * معنا دارد که ما بدهکاریم؛ طرف مقابل نمی‌تواند با اعتبارِ خودش به ما
 * پول بدهد.
 */
export function methodsForDirection(direction) {
  const base = [
    PAYMENT_METHODS.CASH,
    PAYMENT_METHODS.CHECK,
    PAYMENT_METHODS.TRANSFER,
    PAYMENT_METHODS.ON_ACCOUNT,
    PAYMENT_METHODS.MIXED,
  ];
  return direction === MONEY_DIRECTIONS.PAY
    ? [...base, PAYMENT_METHODS.STORE_CREDIT]
    : base;
}

/**
 * تکه‌های معتبرِ یک پرداخت ترکیبی (مبلغ بزرگ‌تر از صفر).
 *
 * شکل هر تکه همان چیزی است که MixedPaymentList مشترک تولید می‌کند —
 * { type, amount, checkNumber?, transferRef? }.
 */
function validMoneyParts(money) {
  return (money?.parts || []).filter((part) => (Number(part.amount) || 0) > 0);
}

/**
 * مبلغِ مؤثرِ یک جابه‌جایی پول. برای روشِ ترکیبی، مجموعِ تکه‌هاست — نه
 * فیلد amount، که در آن حالت اصلاً پر نمی‌شود.
 */
export function moneyAmountOf(money) {
  if (!money) return 0;
  if (money.method === PAYMENT_METHODS.MIXED) {
    return validMoneyParts(money).reduce(
      (sum, part) => sum + (Number(part.amount) || 0),
      0,
    );
  }
  return Number(money.amount) || 0;
}

// ─── ترکیب خالی ─────────────────────────────────────────────────────────────

export function emptyGoodsSlot() {
  return { enabled: false, items: [] };
}

export function emptyMoney() {
  return {
    direction: MONEY_DIRECTIONS.NONE,
    method: PAYMENT_METHODS.CASH,
    amount: "",
    reference: "",
    parts: [],
  };
}

export function emptyComposition(qty = 1) {
  return {
    qty,
    goodsIn: emptyGoodsSlot(),
    goodsOut: emptyGoodsSlot(),
    money: emptyMoney(),
    note: "",
  };
}

// ─── بسط ترکیب به اثر ───────────────────────────────────────────────────────

/**
 * اقلامِ یک محورِ کالایی. اگر کاربر کالای مشخصی انتخاب نکرده باشد،
 * پیش‌فرض همان کالای ادعا با تعدادِ تصمیم است — همان حالتِ پرتکرارِ
 * «همین کالا، همین تعداد».
 */
function goodsItemsOf(slot, claim, qty) {
  const picked = (slot?.items || []).filter(
    (item) => (Number(item.qty) || 0) > 0,
  );
  if (picked.length > 0) return picked;
  if (qty <= 0 || !claim) return [];
  return [
    {
      productId: claim.productId ?? null,
      productCode: claim.productCode ?? "",
      productName: claim.productName ?? "",
      unit: claim.unit ?? "",
      qty,
    },
  ];
}

/**
 * ترکیب را به فهرست اثرهای پایه باز می‌کند — تنها چیزی که واقعاً ذخیره
 * و اجرا می‌شود.
 */
export function expandComposition(composition, claim) {
  if (!composition) return [];

  const effects = [];
  const qty = Number(composition.qty) || 0;
  const note = composition.note || "";

  const pushGoods = (slot, kind) => {
    if (!slot?.enabled) return;
    goodsItemsOf(slot, claim, qty).forEach((item) => {
      effects.push(
        createEffect({
          kind,
          qty: Number(item.qty) || 0,
          productId: item.productId,
          productCode: item.productCode,
          productName: item.productName,
          unit: item.unit,
          note,
        }),
      );
    });
  };

  pushGoods(composition.goodsIn, GOODS_IN);
  pushGoods(composition.goodsOut, GOODS_OUT);

  const money = composition.money || {};
  const amount = moneyAmountOf(money);
  if (money.direction !== MONEY_DIRECTIONS.NONE && amount > 0) {
    const isMixed = money.method === PAYMENT_METHODS.MIXED;
    effects.push(
      createEffect({
        kind: money.direction === MONEY_DIRECTIONS.RECEIVE ? MONEY_IN : MONEY_OUT,
        amount,
        method: money.method,
        reference: isMixed ? "" : money.reference,
        parts: isMixed ? validMoneyParts(money) : [],
        note,
      }),
    );
  }

  return effects;
}

/**
 * یک رکورد تصمیمِ کامل — همان چیزی که روی claim.resolutions می‌نشیند.
 * منبع حقیقت effects است؛ خودِ ترکیب نگه داشته نمی‌شود چون از روی
 * اثرها کامل قابل بازخوانی است.
 */
export function buildResolution(composition, claim) {
  return {
    id: generateId(),
    qty: Number(composition.qty) || 0,
    note: composition.note || "",
    effects: expandComposition(composition, claim),
    createdAt: new Date().toISOString(),
  };
}

// ─── اعتبارسنجی ─────────────────────────────────────────────────────────────

/**
 * فهرست خطاها را برمی‌گرداند (خالی یعنی معتبر) تا فرم و لایه‌ی داده از
 * یک منبع بخوانند و پیام دو جا نوشته نشود.
 *
 * پیام‌ها با واژگانِ خنثی نوشته شده‌اند تا هر دو سمت بتوانند از همین
 * تابع استفاده کنند.
 */
export function validateComposition(composition, claim, { remainingQty } = {}) {
  const errors = [];
  if (!composition) return ["تصمیمی وارد نشده است"];

  const qty = Number(composition.qty) || 0;
  if (qty <= 0 || !Number.isInteger(qty)) {
    errors.push("تعداد باید یک عدد صحیح بزرگ‌تر از صفر باشد");
  } else if (remainingQty != null && qty > remainingQty) {
    errors.push(
      `تعداد این تصمیم از باقیمانده‌ی ادعا (${remainingQty}) بیشتر است`,
    );
  }

  const money = composition.money || {};

  // تصمیمی که هیچ‌کدام از سه محور را فعال نکرده، هیچ اثری تولید نمی‌کند
  // ولی از باقیمانده‌ی ادعا کم می‌شود — یعنی بی‌صدا بخشی از ادعا را
  // می‌بندد بدون اینکه کاری برای طرف حساب انجام شده باشد. برای بستنِ
  // ادعا بدون جبران، مسیرِ صریحِ «رد ادعا» وجود دارد.
  const nothingChosen =
    !composition.goodsIn?.enabled &&
    !composition.goodsOut?.enabled &&
    money.direction === MONEY_DIRECTIONS.NONE;
  if (nothingChosen) {
    errors.push(
      "این تصمیم هیچ اقدامی ندارد؛ دست‌کم یکی از جابه‌جایی کالا یا پول را انتخاب کنید",
    );
  }

  if (money.direction !== MONEY_DIRECTIONS.NONE) {
    if (!methodsForDirection(money.direction).includes(money.method)) {
      errors.push("روش پرداخت برای این جهت مجاز نیست");
    } else if (money.method === PAYMENT_METHODS.MIXED) {
      if (validMoneyParts(money).length === 0) {
        errors.push(
          "برای پرداخت ترکیبی، حداقل یک ردیف با مبلغ بیشتر از صفر لازم است",
        );
      }
      const badPart = validMoneyParts(money).find(
        (part) => !SPLITTABLE_PAYMENT_METHODS.includes(part.type),
      );
      if (badPart) errors.push("روش یکی از ردیف‌های پرداخت ترکیبی نامعتبر است");
    } else if (!(moneyAmountOf(money) > 0)) {
      errors.push("مبلغ باید بزرگ‌تر از صفر باشد");
    }
  }

  return errors;
}

// ─── محاسبات روی ادعا و مرجوعی ──────────────────────────────────────────────

export function claimDecidedQty(claim) {
  return (claim?.resolutions || []).reduce(
    (sum, res) => sum + (Number(res.qty) || 0),
    0,
  );
}

export function claimRemainingQty(claim) {
  return Math.max(0, (Number(claim?.qty) || 0) - claimDecidedQty(claim));
}

function allEffectsOf(returnDoc) {
  return (returnDoc?.claims || []).flatMap((claim) =>
    (claim.resolutions || []).flatMap((res) => res.effects || []),
  );
}

/**
 * اثرهای معلقِ کالایی — دقیقاً همان چیزی که صف‌های انبار باید نشان
 * دهند. GOODS_IN به صف «دریافت» می‌رود و GOODS_OUT به صف «ارسال»؛
 * مرجوعی خرید و فروش هر دو از همین مسیر وارد صف می‌شوند.
 */
export function pendingGoodsEffects(returnDoc, kind) {
  return allEffectsOf(returnDoc).filter(
    (effect) =>
      effect.kind === kind && effect.status === EFFECT_STATUSES.PENDING,
  );
}

/**
 * تخت‌کردن اثرهای کالاییِ یک مرجوعی به ردیف‌هایی که انبار می‌فهمد —
 * هر ردیف، یک اثر به‌همراه زمینه‌ی ادعایی که از آن آمده.
 */
export function buildGoodsLines(returnDoc, kind, { onlyPending = true } = {}) {
  const lines = [];

  (returnDoc?.claims || []).forEach((claim) => {
    (claim.resolutions || []).forEach((resolution) => {
      (resolution.effects || []).forEach((effect) => {
        if (effect.kind !== kind) return;
        if (onlyPending && effect.status !== EFFECT_STATUSES.PENDING) return;

        const qty = Number(effect.qty) || 0;
        const doneQty = Number(effect.doneQty) || 0;

        lines.push({
          effectId: effect.id,
          claimId: claim.id,
          resolutionId: resolution.id,
          // خطِ سندی که ادعا رویش نشسته — انبار و بک‌اند با همین به
          // قلمِ فاکتور/سفارش ارجاع می‌دهند، نه با productId.
          orderLineId: claim.orderLineId ?? null,
          // کالای اثر است، نه کالای ادعا — وقتی کالای جایگزین با کالای
          // برگشتی فرق دارد، انبار باید کالای واقعیِ جابه‌جاشونده را
          // ببیند.
          productId: effect.productId,
          productCode: effect.productCode,
          productName: effect.productName,
          unit: effect.unit,
          unitPrice: claim.unitPrice,
          problem: claim.problem,
          scope: claim.scope,
          claimNote: claim.note || "",
          note: effect.note || "",
          qty,
          doneQty,
          remainingQty: Math.max(0, qty - doneQty),
          restockedQty: effect.restockedQty,
          // مشاهده‌های انبار در همه‌ی دورهای این اثر، تجمیع‌شده.
          observations: observationsOf(effect),
          status: effect.status,
          history: effect.history || [],
        });
      });
    });
  });

  return lines;
}

export function hasPendingGoodsIn(returnDoc) {
  return pendingGoodsEffects(returnDoc, GOODS_IN).length > 0;
}

export function hasPendingGoodsOut(returnDoc) {
  return pendingGoodsEffects(returnDoc, GOODS_OUT).length > 0;
}

function hasAppliedEffects(returnDoc) {
  return allEffectsOf(returnDoc).some(
    (effect) => effect.status === EFFECT_STATUSES.APPLIED,
  );
}

export function summarizeReturn(returnDoc, options) {
  return summarizeEffects(allEffectsOf(returnDoc), options);
}

// ─── ماشین وضعیت ────────────────────────────────────────────────────────────

/**
 * وضعیت را از روی داده مشتق می‌کند.
 *
 * انبار هیچ نقشی در این محاسبه ندارد: مرجوعی‌ای که تصمیمش «فقط بازگشت
 * وجه» است هیچ‌وقت پای انبار به آن باز نمی‌شود و مستقیم از OPEN به
 * SETTLED می‌رود.
 *
 * REJECTED/CANCELLED مشتق نمی‌شوند — اکشن صریح‌اند و همین‌جا دست‌نخورده
 * برگردانده می‌شوند.
 */
export function deriveReturnStatus(returnDoc) {
  if (isTerminalStatus(returnDoc?.status)) return returnDoc.status;

  const claims = returnDoc?.claims || [];
  const totalClaimed = claims.reduce((sum, c) => sum + (Number(c.qty) || 0), 0);
  const totalDecided = claims.reduce((sum, c) => sum + claimDecidedQty(c), 0);

  if (totalDecided === 0) return RETURN_STATUSES.OPEN;

  const hasPending = allEffectsOf(returnDoc).some(
    (effect) => effect.status === EFFECT_STATUSES.PENDING,
  );

  if (totalDecided >= totalClaimed && !hasPending) {
    return RETURN_STATUSES.SETTLED;
  }
  return RETURN_STATUSES.IN_PROGRESS;
}

// ─── نگهبان‌های چرخه‌ی عمر ──────────────────────────────────────────────────

/**
 * حذف/لغو/رد فقط تا وقتی مجازند که هیچ اثری واقعاً اعمال نشده باشد.
 * معیار عمداً «اعمال‌شده» است نه «ثبت‌شده»: تصمیمی که ثبت شده ولی هنوز
 * اثر کالاییِ معلق دارد، هیچ ردی در دنیای بیرون نگذاشته و برگرداندنش
 * بی‌ضرر است.
 */
export function isReturnUntouched(returnDoc) {
  return Boolean(returnDoc) && !hasAppliedEffects(returnDoc);
}

export function canDeleteReturn(returnDoc) {
  return isReturnUntouched(returnDoc) && !isTerminalStatus(returnDoc.status);
}

export const canCancelReturn = canDeleteReturn;
export const canRejectReturn = canDeleteReturn;
