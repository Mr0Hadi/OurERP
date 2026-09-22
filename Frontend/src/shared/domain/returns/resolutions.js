import {
  EFFECT_DIRECTIONS,
  EFFECT_STATUSES,
  createEffect,
  observationsOf,
  summarizeEffects,
} from "./effects";
import {
  PaymentTypeEnum,
  SPLITTABLE_PAYMENT_TYPES,
} from "@/shared/domain/enums/paymentType";
import { RETURN_STATUSES, isTerminalStatus } from "./statuses";
import { CLAIM_SCOPES } from "./scopes";

/**
 * تصمیم‌ها: ترکیب‌شان، بسطشان به اثر، اعتبارسنجی، و ماشین وضعیت —
 * مشترک بین مرجوعی فروش و مرجوعی خرید.
 *
 * یک تصمیم چند محور مستقل دارد که هرکدام می‌تواند باشد یا نباشد:
 *
 *   ۱. کالایی وارد انبار ما شود؟   (goodsIn)
 *   ۲. کالایی از انبار ما خارج شود؟ (goodsOut)
 *   ۳. پولی جابه‌جا شود؟           (moneyIn / moneyOut)
 *   ۴. فقط مرجوعی خرید: کالای قرنطینه آزاد یا اسقاط شود؟ (goodsRelease / goodsScrap)
 *
 * و یک راهِ صریح برای بستنِ بخشی از ادعا بدون هیچ‌کدام: بخشش (writeOff).
 *
 * محورها نسبت به *ما* نام‌گذاری شده‌اند، نه نسبت به طرف حساب:
 *
 *   فروش:  goodsIn = پس‌گرفتن از مشتری   | goodsOut = ارسال برای مشتری
 *   خرید:  goodsIn = دریافت جایگزین      | goodsOut = عودت به تامین‌کننده
 *
 * ساختار داده‌ای که این ماژول فرض می‌کند:
 *
 *   returnDoc
 *     └─ claims[]           ← ادعا (کالا + مشکل + تعداد)
 *          └─ resolutions[] ← تصمیم‌ها برای بخش‌هایی از آن تعداد
 *               └─ effects[]← اثرهای پایه (effects.js)
 */

const { GOODS_IN, GOODS_OUT, MONEY_IN, MONEY_OUT, GOODS_RELEASE, GOODS_SCRAP } =
  EFFECT_DIRECTIONS;

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
 * روش‌هایی که برای هر جهت معنا دارند. «اعتبار خرید بعدی» فقط وقتی معنا
 * دارد که ما بدهکاریم.
 */
export function methodsForDirection(direction) {
  const base = [
    PaymentTypeEnum.CASH,
    PaymentTypeEnum.CHECK,
    PaymentTypeEnum.TRANSFER,
    PaymentTypeEnum.CREDIT,
    PaymentTypeEnum.MIXED,
  ];
  return direction === MONEY_DIRECTIONS.PAY
    ? [...base, PaymentTypeEnum.STORE_CREDIT]
    : base;
}

function validMoneyParts(money) {
  return (money?.parts || []).filter((part) => (Number(part.amount) || 0) > 0);
}

/** مبلغِ مؤثرِ یک جابه‌جایی پول؛ برای روشِ ترکیبی، مجموعِ تکه‌هاست. */
export function moneyAmountOf(money) {
  if (!money) return 0;
  if (money.method === PaymentTypeEnum.MIXED) {
    return validMoneyParts(money).reduce(
      (sum, part) => sum + (Number(part.amount) || 0),
      0,
    );
  }
  return Number(money.amount) || 0;
}

// ─── ترکیب خالی ─────────────────────────────────────────────────────────────

/**
 * اسلاتِ کالای معامله‌شده: فقط «بله/نه» و، در محوری که انتخابگر دارد،
 * اقلامِ انتخاب‌شده. کارمند قیمت یا بهایی وارد نمی‌کند — پولی که واقعاً
 * جابه‌جا می‌شود فقط در بخشِ پول تعیین می‌شود (بکند از ۲۰۲۶-۰۹-۱۷ قیمتِ
 * کالا را نمی‌خواند).
 */
function emptyGoodsSlot() {
  return { enabled: false, items: [] };
}

/** اسلاتِ خروج از قرنطینه — همیشه روی همان کالای ادعا. */
function emptyQuarantineSlot() {
  return { enabled: false };
}

/**
 * اسلاتِ پولی — هم‌شکلِ `MoneyEffectDto`ی بکند، به‌علاوه‌ی `enabled` و
 * `paidNow` که فقط فرم لازم دارد. `paidNow` یعنی «پول همین حالا جابه‌جا
 * شد»؛ نبودنش اثر را یک وعده‌ی معلق می‌کند.
 */
export function emptyMoneyEffect() {
  return {
    enabled: false,
    method: PaymentTypeEnum.CASH,
    amount: "",
    reference: "",
    parts: [],
    paidNow: true,
  };
}

export function emptyComposition(quantity = 1) {
  return {
    quantity,
    goodsIn: emptyGoodsSlot(),
    goodsOut: emptyGoodsSlot(),
    goodsRelease: emptyQuarantineSlot(),
    goodsScrap: emptyQuarantineSlot(),
    moneyIn: emptyMoneyEffect(),
    moneyOut: emptyMoneyEffect(),
    writeOff: false,
    note: "",
  };
}

/** جهتِ فعلیِ پول — از روی اسلاتِ فعال مشتق می‌شود، نه یک فیلدِ جدا. */
export function moneyDirectionOf(composition) {
  if (composition?.moneyIn?.enabled) return MONEY_DIRECTIONS.RECEIVE;
  if (composition?.moneyOut?.enabled) return MONEY_DIRECTIONS.PAY;
  return MONEY_DIRECTIONS.NONE;
}

/**
 * بهای کالایی که از قرنطینه خارج می‌شود — به کاربر نشان داده نمی‌شود.
 *
 * ⚠️ فقط پلِ سازگاری است: بکندِ فعلیِ `main` این عدد را روی آزادسازی،
 * اسقاط و عودت از قرنطینه می‌خواند. برنچِ `feature/quarantine-unit-cost`
 * بها را روی خودِ دانه نگه می‌دارد و این فیلد را نادیده می‌گیرد؛ بعد از
 * ادغامِ آن، این تابع و فرستادنش حذف می‌شوند.
 *
 * کالای معیوبِ سهمِ سفارش پولش داده شده، پس قیمتِ همان قلم؛ مازاد و
 * کالای خارج از سند پولی بابتشان داده نشده، پس صفر.
 */
export function defaultQuarantineUnitCost(claim) {
  return claim?.scope === CLAIM_SCOPES.ON_ORDER ? Number(claim.unitPrice) || 0 : 0;
}

// ─── بسط ترکیب به اثر ───────────────────────────────────────────────────────

const hasValue = (value) => value !== "" && value != null;

/**
 * اقلامِ یک محورِ کالاییِ معامله‌شده. اگر کاربر کالای مشخصی انتخاب نکرده
 * باشد، پیش‌فرض همان کالای ادعا با تعدادِ تصمیم است. قیمتِ ادعا فقط
 * به‌عنوان سابقه روی اثر ثبت می‌شود؛ هیچ قاعده‌ای آن را نمی‌خواند.
 */
function goodsItemsOf(slot, claim, quantity) {
  const picked = (slot?.items || []).filter(
    (item) => (Number(item.quantity) || 0) > 0,
  );
  if (picked.length > 0) return picked;
  if (quantity <= 0 || !claim) return [];
  return [
    {
      productId: claim.productId ?? null,
      productCode: claim.productCode ?? "",
      productName: claim.productName ?? "",
      unit: claim.unit ?? "",
      quantity,
      unitPrice: claim.unitPrice ?? null,
    },
  ];
}

/**
 * مبلغِ پیشنهادیِ پول: ارزشِ همین تعداد از ادعا به قیمتِ ادعا. فقط
 * پیشنهاد است — کارمند بعد از گفت‌وگو با طرف حساب هر مبلغی را ثبت
 * می‌کند و هیچ قاعده‌ای آن را با کالا تراز نمی‌کند.
 */
export function suggestedMoneyAmount(composition, claim) {
  const quantity = Number(composition?.quantity) || 0;
  return quantity * (Number(claim?.unitPrice) || 0);
}

/** ترکیب را به فهرست اثرهای پایه باز می‌کند — فقط برای پیش‌نمایش. */
export function expandComposition(composition, claim) {
  if (!composition || composition.writeOff) return [];

  const effects = [];
  const quantity = Number(composition.quantity) || 0;
  const note = composition.note || "";

  const pushGoods = (slot, direction) => {
    if (!slot?.enabled) return;
    goodsItemsOf(slot, claim, quantity).forEach((item) => {
      effects.push(
        createEffect({
          direction,
          quantity: Number(item.quantity) || 0,
          productId: item.productId,
          productCode: item.productCode,
          productName: item.productName,
          unit: item.unit,
          unitPrice: hasValue(item.unitPrice) ? Number(item.unitPrice) : null,
          note,
        }),
      );
    });
  };

  const pushQuarantine = (slot, direction) => {
    if (!slot?.enabled || quantity <= 0 || !claim) return;
    effects.push(
      createEffect({
        direction,
        quantity,
        productId: claim.productId,
        productCode: claim.productCode,
        productName: claim.productName,
        unit: claim.unit,
        note,
      }),
    );
  };

  pushGoods(composition.goodsIn, GOODS_IN);
  pushGoods(composition.goodsOut, GOODS_OUT);
  pushQuarantine(composition.goodsRelease, GOODS_RELEASE);
  pushQuarantine(composition.goodsScrap, GOODS_SCRAP);

  const pushMoney = (slot, direction) => {
    if (!slot?.enabled) return;
    const amount = moneyAmountOf(slot);
    if (amount <= 0) return;
    const isMixed = slot.method === PaymentTypeEnum.MIXED;
    effects.push(
      createEffect({
        direction,
        amount,
        method: slot.method,
        reference: isMixed ? "" : slot.reference,
        parts: isMixed ? validMoneyParts(slot) : [],
        paidAt: slot.paidNow ? new Date().toISOString() : null,
        note,
      }),
    );
  };

  pushMoney(composition.moneyIn, MONEY_IN);
  pushMoney(composition.moneyOut, MONEY_OUT);

  return effects;
}

/**
 * ترکیبِ فرم → بدنه‌ی `EffectCompositionDto`ی بکند.
 *
 * تفاوت‌های شکلیِ فرم و دستور، همه واقعی‌اند، نه اختلافِ نام‌گذاری:
 *
 *  ۱. `enabled` و `paidNow` فقط مالِ فرم‌اند؛ بکند «خاموش» را با نبودنِ
 *     اسلات و «پرداخت‌شده» را با `paidAt` بیان می‌کند.
 *  ۲. اسلاتِ کالا در فرم شیء است (`{enabled, items}`) و در دستور آرایه.
 *  ۳. پیش‌فرضِ «همان کالای ادعا» همین‌جا باز می‌شود: بکند روی آرایه‌ی
 *     خالی هیچ اثری نمی‌سازد.
 *  ۴. `unitPrice` فقط سابقه است (قیمتِ ادعا برای همان کالا، یا قیمتی که
 *     در انتخابگر مانده) و نبودنش مجاز است.
 *  ۵. بخشش با هیچ اثری همراه نمی‌شود.
 *
 * `quarantineCost` (فقط مرجوعی خرید): پلِ سازگاری با بکندِ فعلیِ `main` —
 * بهای خروج از قرنطینه را بی‌صدا از `defaultQuarantineUnitCost` می‌فرستد.
 * بعد از ادغامِ `feature/quarantine-unit-cost` حذف شود.
 */
export function toApiComposition(composition, claim, { quarantineCost = false } = {}) {
  if (!composition) return null;

  const quantity = Number(composition.quantity) || 0;
  const note = composition.note || undefined;

  if (composition.writeOff) {
    return { quantity, note, writeOff: true };
  }

  const heldCost = quarantineCost ? defaultQuarantineUnitCost(claim) : undefined;

  const goodsOf = (slot, { fromQuarantine = false } = {}) => {
    if (!slot?.enabled) return undefined;
    return goodsItemsOf(slot, claim, quantity)
      .filter((item) => (Number(item.quantity) || 0) > 0)
      .map((item) => {
        const productId = item.productId ?? claim?.productId ?? null;
        return {
          quantity: Number(item.quantity) || 0,
          productId,
          unitPrice: hasValue(item.unitPrice) ? Number(item.unitPrice) : undefined,
          // فقط وقتی عودت از قرنطینه باشد خوانده می‌شود؛ از قفسه نادیده گرفته می‌شود.
          unitCost:
            fromQuarantine && productId === claim?.productId ? heldCost : undefined,
        };
      });
  };

  const quarantineOf = (slot) => {
    if (!slot?.enabled || quantity <= 0) return undefined;
    return [
      {
        quantity,
        productId: claim?.productId ?? null,
        unitCost: heldCost,
      },
    ];
  };

  const moneyOf = (slot) => {
    if (!slot?.enabled) return undefined;
    const amount = moneyAmountOf(slot);
    if (amount <= 0) return undefined;

    const isMixed = slot.method === PaymentTypeEnum.MIXED;
    return {
      method: slot.method,
      amount,
      reference: isMixed ? undefined : slot.reference || undefined,
      paidAt: slot.paidNow ? new Date().toISOString() : undefined,
      parts: isMixed
        ? validMoneyParts(slot).map((part) => ({
            method: part.method,
            amount: Number(part.amount) || 0,
            checkNumber: part.checkNumber || undefined,
            transferRef: part.transferRef || undefined,
          }))
        : undefined,
    };
  };

  return {
    quantity,
    note,
    goodsIn: goodsOf(composition.goodsIn),
    goodsOut: goodsOf(composition.goodsOut, { fromQuarantine: quarantineCost }),
    goodsRelease: quarantineOf(composition.goodsRelease),
    goodsScrap: quarantineOf(composition.goodsScrap),
    moneyIn: moneyOf(composition.moneyIn),
    moneyOut: moneyOf(composition.moneyOut),
  };
}

// ─── اعتبارسنجی ─────────────────────────────────────────────────────────────

/**
 * فهرست خطاها را برمی‌گرداند (خالی یعنی معتبر) تا فرم و لایه‌ی داده از یک
 * منبع بخوانند. فقط شکلِ تصمیم را می‌سنجد، نه «درستیِ» توافق: هیچ قیمت یا
 * ترازی الزامی نیست.
 *
 * `allowQuarantine` فقط در مرجوعی خرید روشن است — سرور روی مرجوعی فروش
 * آزادسازی و اسقاط را رد می‌کند. `quarantineAvailable` تعدادِ کالای همین
 * ادعا در قرنطینه است (`null` یعنی نامعلوم، پس سنجیده نمی‌شود).
 */
export function validateComposition(
  composition,
  claim,
  { remainingQuantity, allowQuarantine = false, quarantineAvailable = null } = {},
) {
  const errors = [];
  if (!composition) return ["تصمیمی وارد نشده است"];

  const quantity = Number(composition.quantity) || 0;
  if (quantity <= 0 || !Number.isInteger(quantity)) {
    errors.push("تعداد باید یک عدد صحیح بزرگ‌تر از صفر باشد");
  } else if (remainingQuantity != null && quantity > remainingQuantity) {
    errors.push(
      `تعداد این تصمیم از باقیمانده‌ی ادعا (${remainingQuantity}) بیشتر است`,
    );
  }

  const direction = moneyDirectionOf(composition);
  const activeMoney =
    direction === MONEY_DIRECTIONS.RECEIVE
      ? composition.moneyIn
      : direction === MONEY_DIRECTIONS.PAY
        ? composition.moneyOut
        : null;

  const hasGoods = composition.goodsIn?.enabled || composition.goodsOut?.enabled;
  const hasQuarantine =
    composition.goodsRelease?.enabled || composition.goodsScrap?.enabled;

  if (composition.writeOff) {
    if (hasGoods || hasQuarantine || activeMoney) {
      errors.push("بخشش با هیچ جابه‌جایی کالا یا پولی همراه نمی‌شود");
    }
    return errors;
  }

  if (!hasGoods && !hasQuarantine && !activeMoney) {
    errors.push(
      "این تصمیم هیچ اقدامی ندارد؛ یکی از جابه‌جایی کالا یا پول را انتخاب کنید، یا این تعداد را صریحاً ببخشید",
    );
  }

  if (hasQuarantine && !allowQuarantine) {
    errors.push("آزادسازی و اسقاطِ قرنطینه فقط در مرجوعی خرید ممکن است");
  }

  // یک تصمیم برای همان کالاهای ادعا فقط یک سرنوشت دارد: عودت، آزادسازی یا
  // اسقاط. هر سه به‌طور پیش‌فرض کلِ تعدادِ تصمیم را برمی‌دارند، پس فعال‌بودنِ
  // دوتا یعنی یک دانه‌ی قرنطینه دو بار خرج می‌شود. برای تقسیم، چند تصمیم با
  // تعدادهای جدا ثبت کنید.
  if (allowQuarantine) {
    const fates = [
      composition.goodsOut?.enabled,
      composition.goodsRelease?.enabled,
      composition.goodsScrap?.enabled,
    ].filter(Boolean).length;
    if (fates > 1) {
      errors.push(
        "عودت، آزادسازی و اسقاط را در یک تصمیم ترکیب نکنید؛ برای تقسیم، چند تصمیم با تعداد جدا ثبت کنید",
      );
    }
  }

  if (hasQuarantine && quarantineAvailable != null && quantity > quarantineAvailable) {
    errors.push(
      `برای این ادعا فقط ${quarantineAvailable.toLocaleString("fa-IR")} عدد کالا در قرنطینه است`,
    );
  }

  if (activeMoney) {
    if (!methodsForDirection(direction).includes(activeMoney.method)) {
      errors.push("روش پرداخت برای این جهت مجاز نیست");
    } else if (activeMoney.method === PaymentTypeEnum.MIXED) {
      if (validMoneyParts(activeMoney).length === 0) {
        errors.push("برای پرداخت ترکیبی، حداقل یک ردیف با مبلغ بیشتر از صفر لازم است");
      }
      const badPart = validMoneyParts(activeMoney).find(
        (part) => !SPLITTABLE_PAYMENT_TYPES.includes(part.method),
      );
      if (badPart) errors.push("روش یکی از ردیف‌های پرداخت ترکیبی نامعتبر است");
    } else if (!(moneyAmountOf(activeMoney) > 0)) {
      errors.push("مبلغ باید بزرگ‌تر از صفر باشد");
    }
  }

  return errors;
}

// ─── محاسبات روی ادعا و مرجوعی ──────────────────────────────────────────────

export function claimDecidedQuantity(claim) {
  return (claim?.resolutions || []).reduce(
    (sum, res) => sum + (Number(res.quantity) || 0),
    0,
  );
}

export function claimRemainingQuantity(claim) {
  return Math.max(0, (Number(claim?.quantity) || 0) - claimDecidedQuantity(claim));
}

function allEffectsOf(returnDoc) {
  return (returnDoc?.claims || []).flatMap((claim) =>
    (claim.resolutions || []).flatMap((res) => res.effects || []),
  );
}

function hasPendingEffect(returnDoc, directions) {
  return allEffectsOf(returnDoc).some(
    (effect) =>
      directions.includes(effect.direction) &&
      effect.status === EFFECT_STATUSES.PENDING,
  );
}

/**
 * تخت‌کردن اثرهای کالاییِ یک مرجوعی به ردیف‌هایی که انبار می‌فهمد —
 * هر ردیف، یک اثر به‌همراه زمینه‌ی ادعایی که از آن آمده.
 *
 * `directions` یک جهت یا فهرستی از جهت‌هاست — صفحه‌ی انبارِ مرجوعیِ خرید
 * عودت، آزادسازی و اسقاط را با هم نشان می‌دهد.
 */
export function buildGoodsLines(returnDoc, directions, { onlyPending = true } = {}) {
  const wanted = Array.isArray(directions) ? directions : [directions];
  const lines = [];

  (returnDoc?.claims || []).forEach((claim) => {
    (claim.resolutions || []).forEach((resolution) => {
      (resolution.effects || []).forEach((effect) => {
        if (!wanted.includes(effect.direction)) return;
        if (onlyPending && effect.status !== EFFECT_STATUSES.PENDING) return;

        const quantity = Number(effect.quantity) || 0;
        const appliedQuantity = Number(effect.appliedQuantity) || 0;
        const sameProduct = effect.productId === claim.productId;

        lines.push({
          effectId: effect.id,
          direction: effect.direction,
          claimId: claim.id,
          resolutionId: resolution.id,
          orderLineId: claim.orderLineId ?? null,
          // کالای اثر است، نه کالای ادعا — وقتی کالای جایگزین با کالای
          // برگشتی فرق دارد، انبار باید کالای واقعیِ جابه‌جاشونده را ببیند.
          // `*ReturnEffectDto` کد و واحد ندارد؛ برای همان کالای ادعا از
          // خودِ ادعا برداشته می‌شوند.
          productId: effect.productId,
          productCode: sameProduct ? claim.productCode : "",
          productName: effect.productName,
          unit: sameProduct ? claim.unit : "",
          unitPrice: effect.unitPrice ?? claim.unitPrice,
          unitCost: effect.unitCost ?? null,
          problem: claim.problem,
          scope: claim.scope,
          offScopeKind: claim.offScopeKind ?? null,
          claimNote: claim.note || "",
          note: effect.note || "",
          quantity,
          appliedQuantity,
          remainingQuantity: Math.max(0, quantity - appliedQuantity),
          restockedQuantity: effect.restockedQuantity,
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
  return hasPendingEffect(returnDoc, [GOODS_IN]);
}

export function hasPendingGoodsOut(returnDoc) {
  return hasPendingEffect(returnDoc, [GOODS_OUT]);
}

/** آزادسازی یا اسقاطِ قرنطینه‌ای که انبار هنوز اجرا نکرده. */
export function hasPendingQuarantineExit(returnDoc) {
  return hasPendingEffect(returnDoc, [GOODS_RELEASE, GOODS_SCRAP]);
}

export function summarizeReturn(returnDoc, options) {
  return summarizeEffects(allEffectsOf(returnDoc), options);
}

// ─── ماشین وضعیت ────────────────────────────────────────────────────────────

/**
 * وضعیت را از روی داده مشتق می‌کند — همان قاعده‌ی `RecomputeReturnStatus`.
 * REJECTED/CANCELLED مشتق نمی‌شوند؛ اکشن صریح‌اند.
 *
 * نگهبان‌های چرخه‌ی عمر (لغو/رد/حذف/بازگشایی) اینجا نیستند: سند پرچم‌های
 * `canCancel`/`canReject`/`canDelete`/`canReopen` را از همان قاعده‌ای
 * می‌آورد که سرور هنگام اجرا اعمال می‌کند، و نسخه‌ی محلی روزی از آن جدا
 * می‌افتاد.
 */
export function deriveReturnStatus(returnDoc) {
  if (isTerminalStatus(returnDoc?.status)) return returnDoc.status;

  const claims = returnDoc?.claims || [];
  const totalClaimed = claims.reduce((sum, c) => sum + (Number(c.quantity) || 0), 0);
  const totalDecided = claims.reduce((sum, c) => sum + claimDecidedQuantity(c), 0);

  if (totalDecided === 0) return RETURN_STATUSES.OPEN;

  const hasPending = allEffectsOf(returnDoc).some(
    (effect) => effect.status === EFFECT_STATUSES.PENDING,
  );

  if (totalDecided >= totalClaimed && !hasPending) {
    return RETURN_STATUSES.SETTLED;
  }
  return RETURN_STATUSES.IN_PROGRESS;
}
