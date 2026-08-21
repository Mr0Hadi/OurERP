// src/features/sales/returns/domain/returnResolutions.js

import { SALES_RETURN_STATUSES, isTerminalStatus } from "./returnVocabulary";
import {
  EFFECT_KINDS,
  EFFECT_STATUSES,
  MONEY_CHANNELS,
  PAYMENT_METHODS,
  createEffect,
  summarizeEffects,
} from "./returnEffects";

/**
 * تصمیم‌ها: ترکیب‌شان، بسطشان به اثر، اعتبارسنجی، و ماشین وضعیت.
 *
 * یک تصمیم سه محور مستقل دارد که هرکدام می‌تواند باشد یا نباشد:
 *
 *   ۱. کالا از مشتری پس گرفته شود؟
 *   ۲. کالایی برای مشتری ارسال شود؟ (هر کالایی، با هر تعدادی — لازم
 *      نیست همان کالای ادعا باشد)
 *   ۳. پولی جابه‌جا شود؟ (دریافت از مشتری / پرداخت به مشتری / اعتبار)
 *
 * هشت ترکیب ممکن از این سه محور، همان چیزی است که قبلاً به‌صورت یک
 * فهرست ثابتِ «نوع تصمیم» نوشته می‌شد. با این مدل، فهرست حذف می‌شود:
 * کاربر مستقیم همان سه سوال را جواب می‌دهد و سیستم اثرها را می‌سازد.
 *
 * ساختار داده‌ای که این ماژول فرض می‌کند:
 *
 *   salesReturn
 *     └─ claims[]           ← ادعای واحد فروش (کالا + مشکل + تعداد)
 *          └─ resolutions[] ← تصمیم‌های گرفته‌شده برای بخش‌هایی از آن تعداد
 *               └─ effects[]← اثرهای پایه (returnEffects.js)
 */

const generateId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

const { GOODS_IN, GOODS_OUT, MONEY_IN, MONEY_OUT } = EFFECT_KINDS;

// ─── جهت پول ────────────────────────────────────────────────────────────────

/**
 * سه حالتی که برای پول ممکن است. «اعتبار» جهتش مثل پرداخت است (به نفع
 * مشتری) ولی کانالش فرق دارد و روی مبلغ همین فاکتور نمی‌نشیند.
 */
export const MONEY_DIRECTIONS = {
  NONE: "none",
  RECEIVE: "receive",
  PAY: "pay",
  CREDIT: "credit",
};

export const MONEY_DIRECTION_LABELS = {
  [MONEY_DIRECTIONS.NONE]: "بدون جابه‌جایی پول",
  [MONEY_DIRECTIONS.RECEIVE]: "دریافت پول از مشتری",
  [MONEY_DIRECTIONS.PAY]: "پرداخت پول به مشتری",
  [MONEY_DIRECTIONS.CREDIT]: "ثبت اعتبار برای خرید بعدی",
};

export function movesRealMoney(direction) {
  return (
    direction === MONEY_DIRECTIONS.RECEIVE || direction === MONEY_DIRECTIONS.PAY
  );
}

// ─── ترکیب خالی ─────────────────────────────────────────────────────────────

export function emptyComposition(qty = 1) {
  return {
    qty,
    takeBack: false,
    sendReplacement: false,
    replacementItems: [],
    money: {
      direction: MONEY_DIRECTIONS.NONE,
      amount: "",
      method: PAYMENT_METHODS.CASH,
      reference: "",
    },
    note: "",
  };
}

/** آیا این ترکیب اصلاً کاری انجام می‌دهد؟ */
export function isEmptyComposition(composition) {
  return (
    !composition?.takeBack &&
    !composition?.sendReplacement &&
    composition?.money?.direction === MONEY_DIRECTIONS.NONE
  );
}

// ─── بسط ترکیب به اثر ───────────────────────────────────────────────────────

/**
 * ترکیب را به فهرست اثرهای پایه باز می‌کند — تنها چیزی که واقعاً ذخیره
 * و اجرا می‌شود.
 */
export function expandComposition(composition, claim) {
  if (!composition) return [];

  const effects = [];
  const qty = Number(composition.qty) || 0;
  const note = composition.note || "";

  if (composition.takeBack && qty > 0) {
    effects.push(
      createEffect({
        kind: GOODS_IN,
        qty,
        productId: claim?.productId ?? null,
        productCode: claim?.productCode ?? "",
        productName: claim?.productName ?? "",
        unit: claim?.unit ?? "",
        note,
      }),
    );
  }

  if (composition.sendReplacement) {
    (composition.replacementItems || []).forEach((item) => {
      const itemQty = Number(item.qty) || 0;
      if (itemQty <= 0) return;
      effects.push(
        createEffect({
          kind: GOODS_OUT,
          qty: itemQty,
          productId: item.productId,
          productCode: item.productCode,
          productName: item.productName,
          unit: item.unit,
          note,
        }),
      );
    });
  }

  const money = composition.money || {};
  const amount = Number(money.amount) || 0;
  if (money.direction !== MONEY_DIRECTIONS.NONE && amount > 0) {
    const isReceive = money.direction === MONEY_DIRECTIONS.RECEIVE;
    const isCredit = money.direction === MONEY_DIRECTIONS.CREDIT;
    effects.push(
      createEffect({
        kind: isReceive ? MONEY_IN : MONEY_OUT,
        amount,
        channel: isCredit ? MONEY_CHANNELS.STORE_CREDIT : MONEY_CHANNELS.CASH,
        method: isCredit ? null : money.method,
        reference: isCredit ? "" : money.reference,
        note,
      }),
    );
  }

  return effects;
}

/**
 * یک رکورد تصمیمِ کامل — همان چیزی که روی claim.resolutions می‌نشیند.
 *
 * خودِ ترکیب هم نگه داشته می‌شود، نه برای محاسبه (منبع حقیقت همیشه
 * effects است) بلکه برای اینکه بعداً بشود نشان داد کاربر دقیقاً چه
 * چیزی را تیک زده بود.
 */
export function buildResolution(composition, claim) {
  return {
    id: generateId(),
    qty: Number(composition.qty) || 0,
    note: composition.note || "",
    composition: {
      takeBack: Boolean(composition.takeBack),
      sendReplacement: Boolean(composition.sendReplacement),
      moneyDirection: composition.money?.direction ?? MONEY_DIRECTIONS.NONE,
    },
    effects: expandComposition(composition, claim),
    createdAt: new Date().toISOString(),
  };
}

// ─── اعتبارسنجی ─────────────────────────────────────────────────────────────

/**
 * فهرست خطاها را برمی‌گرداند (خالی یعنی معتبر) تا فرم و لایه‌ی داده از
 * یک منبع بخوانند و پیام دو جا نوشته نشود.
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

  if (isEmptyComposition(composition)) {
    errors.push(
      "حداقل یکی از سه مورد (پس‌گرفتن کالا، ارسال کالا، جابه‌جایی پول) باید انتخاب شود",
    );
  }

  if (composition.sendReplacement) {
    const items = (composition.replacementItems || []).filter(
      (item) => (Number(item.qty) || 0) > 0,
    );
    if (items.length === 0) {
      errors.push("برای ارسال کالا، حداقل یک کالا با تعداد بیشتر از صفر انتخاب کنید");
    }
  }

  const money = composition.money || {};
  if (money.direction !== MONEY_DIRECTIONS.NONE) {
    if (!(Number(money.amount) > 0)) {
      errors.push("مبلغ باید بزرگ‌تر از صفر باشد");
    }
    if (movesRealMoney(money.direction) && !money.method) {
      errors.push("روش پرداخت انتخاب نشده است");
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

export function isClaimFullyDecided(claim) {
  return claimRemainingQty(claim) === 0;
}

export function allEffectsOf(salesReturn) {
  return (salesReturn?.claims || []).flatMap((claim) =>
    (claim.resolutions || []).flatMap((res) => res.effects || []),
  );
}

/**
 * اثرهای معلقِ کالایی — دقیقاً همان چیزی که صف‌های انبار باید نشان
 * دهند. GOODS_IN به صف «دریافت» می‌رود و GOODS_OUT به صف «ارسال».
 * مرجوعی‌ای که هیچ اثر کالاییِ معلقی ندارد اصلاً در انبار دیده
 * نمی‌شود.
 */
export function pendingGoodsEffects(salesReturn, kind) {
  return allEffectsOf(salesReturn).filter(
    (effect) =>
      effect.kind === kind && effect.status === EFFECT_STATUSES.PENDING,
  );
}

/**
 * تخت‌کردن اثرهای کالاییِ یک مرجوعی به ردیف‌هایی که انبار می‌فهمد —
 * هر ردیف، یک اثر به‌همراه زمینه‌ی ادعایی که از آن آمده.
 *
 * هر دو صف انبار (دریافت و ارسال) از همین یک تابع می‌خوانند و فقط
 * kind را عوض می‌کنند، چون «تحویل‌گرفتن کالای برگشتی» و «ارسال کالا»
 * یک عملیات‌اند با جهت مخالف.
 */
export function buildGoodsLines(salesReturn, kind, { onlyPending = true } = {}) {
  const lines = [];

  (salesReturn?.claims || []).forEach((claim) => {
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
          status: effect.status,
          history: effect.history || [],
        });
      });
    });
  });

  return lines;
}

export function hasPendingGoodsIn(salesReturn) {
  return pendingGoodsEffects(salesReturn, GOODS_IN).length > 0;
}

export function hasPendingGoodsOut(salesReturn) {
  return pendingGoodsEffects(salesReturn, GOODS_OUT).length > 0;
}

export function hasAppliedEffects(salesReturn) {
  return allEffectsOf(salesReturn).some(
    (effect) => effect.status === EFFECT_STATUSES.APPLIED,
  );
}

export function summarizeReturn(salesReturn, options) {
  return summarizeEffects(allEffectsOf(salesReturn), options);
}

// ─── ماشین وضعیت ────────────────────────────────────────────────────────────

/**
 * وضعیت را از روی داده مشتق می‌کند.
 *
 * بازرسی انبار هیچ نقشی در این محاسبه ندارد: مرجوعی‌ای که تصمیمش «فقط
 * بازگشت وجه» است هیچ‌وقت پای انبار به آن باز نمی‌شود و مستقیم از OPEN
 * به SETTLED می‌رود.
 *
 * REJECTED/CANCELLED مشتق نمی‌شوند — اکشن صریح‌اند و همین‌جا دست‌نخورده
 * برگردانده می‌شوند.
 */
export function deriveReturnStatus(salesReturn) {
  if (isTerminalStatus(salesReturn?.status)) return salesReturn.status;

  const claims = salesReturn?.claims || [];
  const totalClaimed = claims.reduce((sum, c) => sum + (Number(c.qty) || 0), 0);
  const totalDecided = claims.reduce((sum, c) => sum + claimDecidedQty(c), 0);

  if (totalDecided === 0) return SALES_RETURN_STATUSES.OPEN;

  const hasPending = allEffectsOf(salesReturn).some(
    (effect) => effect.status === EFFECT_STATUSES.PENDING,
  );

  if (totalDecided >= totalClaimed && !hasPending) {
    return SALES_RETURN_STATUSES.SETTLED;
  }
  return SALES_RETURN_STATUSES.IN_PROGRESS;
}

// ─── نگهبان‌های چرخه‌ی عمر ──────────────────────────────────────────────────

/**
 * حذف/لغو/رد فقط تا وقتی مجازند که هیچ اثری واقعاً اعمال نشده باشد.
 * معیار عمداً «اعمال‌شده» است نه «ثبت‌شده»: تصمیمی که ثبت شده ولی هنوز
 * اثر کالاییِ معلق دارد، هیچ ردی در دنیای بیرون نگذاشته و برگرداندنش
 * بی‌ضرر است.
 */
function isUntouched(salesReturn) {
  return Boolean(salesReturn) && !hasAppliedEffects(salesReturn);
}

export function canDeleteSalesReturn(salesReturn) {
  return isUntouched(salesReturn) && !isTerminalStatus(salesReturn.status);
}

export function canCancelSalesReturn(salesReturn) {
  return isUntouched(salesReturn) && !isTerminalStatus(salesReturn.status);
}

export function canRejectSalesReturn(salesReturn) {
  return isUntouched(salesReturn) && !isTerminalStatus(salesReturn.status);
}

export function canAddResolution(salesReturn) {
  if (!salesReturn) return false;
  if (isTerminalStatus(salesReturn.status)) return false;
  return (salesReturn.claims || []).some((claim) => claimRemainingQty(claim) > 0);
}
