import {
  EFFECT_STATUSES,
  observationsOf,
  summarizeEffects,
} from "./effects";
import { PaymentTypeEnum } from "@/shared/domain/enums/paymentType";
import { ProductUnitStatusEnum } from "@/shared/domain/enums/unitStatus";
import { nowLocalIso } from "@/shared/lib/dateUtils";

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

function validMoneyParts(money) {
  return (money?.parts || []).filter((part) => (Number(part.amount) || 0) > 0);
}

/** مبلغِ مؤثرِ یک جابه‌جایی پول؛ برای روشِ ترکیبی، مجموعِ تکه‌هاست. */
function moneyAmountOf(money) {
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
  return { enabled: false, items: [], source: null };
}

/** اسلاتِ خروج از قرنطینه — همیشه روی همان کالای ادعا. */
function emptyQuarantineSlot(source = null) {
  return { enabled: false, source };
}

/**
 * منبعِ کالای خروجی در مرجوعی خرید (`ProductUnitStatusEnum`): موجودیِ قفسه
 * یا قرنطینه. از کاربر پرسیده نمی‌شود: عودت و اسقاط یعنی *همان* کالای
 * معیوب، پس `resolveSources` اول قرنطینه‌ی آزادِ همین ادعا را برمی‌دارد و فقط
 * باقی را از قفسه (عیبی که بعد از دریافت روی قفسه پیدا شده).
 */
const GOODS_SOURCES = {
  IN_STOCK: ProductUnitStatusEnum.IN_STOCK,
  QUARANTINED: ProductUnitStatusEnum.QUARANTINED,
};

/**
 * سهمِ قرنطینه و قفسه برای عودت/اسقاطِ همان کالای ادعا: قرنطینه‌ی آزادِ ادعا
 * اول، باقی از قفسه. کالای خارج از سفارش هرگز روی قفسه نبوده.
 */
export function sourceSplit(quantity, { quarantineAvailable, offScope }) {
  const total = Math.max(0, Number(quantity) || 0);
  const fromQuarantine = offScope ? total : Math.min(total, Math.max(0, quarantineAvailable ?? 0));
  return { fromQuarantine, fromStock: total - fromQuarantine };
}

/**
 * پیش از ارسال: سهمِ قرنطینه‌ی عودت و اسقاط روی خودِ اسلات نوشته می‌شود
 * (`fromQuarantine`) تا `toApiComposition` آن را به دو ردیف با `source` جدا بشکند.
 */
export function resolveSources(composition, { quarantineAvailable, offScope }) {
  const quantity = Number(composition.quantity) || 0;
  const { fromQuarantine } = sourceSplit(quantity, { quarantineAvailable, offScope });
  const withSplit = (slot) => (slot?.enabled ? { ...slot, fromQuarantine } : slot);
  return {
    ...composition,
    goodsOut: withSplit(composition.goodsOut),
    goodsScrap: withSplit(composition.goodsScrap),
  };
}

/** یک ردیفِ کالا → یک یا دو ردیف با `source` (قرنطینه، قفسه). */
function splitBySource(entry, fromQuarantine) {
  if (fromQuarantine == null) return [entry];
  const fromQ = Math.min(entry.quantity, fromQuarantine);
  return [
    { ...entry, quantity: fromQ, source: GOODS_SOURCES.QUARANTINED },
    { ...entry, quantity: entry.quantity - fromQ, source: GOODS_SOURCES.IN_STOCK },
  ].filter((part) => part.quantity > 0);
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

/** نامِ اسلاتِ پولِ فعال (`"moneyIn"`/`"moneyOut"`) یا `null`. */
export function activeMoneySlotOf(composition) {
  const direction = moneyDirectionOf(composition);
  if (direction === MONEY_DIRECTIONS.RECEIVE) return "moneyIn";
  if (direction === MONEY_DIRECTIONS.PAY) return "moneyOut";
  return null;
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
 *  ۶. `unitCost` فرستاده نمی‌شود: آزادسازی، اسقاط و عودت از قرنطینه با
 *     بهای ثبت‌شده روی خودِ دانه (`QuarantineCost`) حرکت می‌کنند و بکند
 *     هر عددی را که فرانت بفرستد نادیده می‌گیرد.
 *  ۷. `source` فقط برای عودت و اسقاطِ مرجوعی خرید، از `resolveSources`:
 *     قرنطینه‌ی آزادِ ادعا اول و باقی از قفسه (در صورت لزوم دو ردیف). روی
 *     مرجوعی فروش همیشه خالی است (بکند ۴۰۰ می‌دهد).
 */
export function toApiComposition(composition, claim) {
  if (!composition) return null;

  const quantity = Number(composition.quantity) || 0;
  const note = composition.note || undefined;

  if (composition.writeOff) {
    return { quantity, note, writeOff: true };
  }

  const goodsOf = (slot) => {
    if (!slot?.enabled) return undefined;
    return goodsItemsOf(slot, claim, quantity)
      .filter((item) => (Number(item.quantity) || 0) > 0)
      .flatMap((item) => {
        const productId = item.productId ?? claim?.productId ?? null;
        return splitBySource(
          {
            quantity: Number(item.quantity) || 0,
            productId,
            unitPrice: hasValue(item.unitPrice) ? Number(item.unitPrice) : undefined,
            source: slot.source ?? undefined,
          },
          slot.fromQuarantine,
        );
      });
  };

  const quarantineOf = (slot) => {
    if (!slot?.enabled || quantity <= 0) return undefined;
    return splitBySource(
      {
        quantity,
        productId: claim?.productId ?? null,
        source: slot.source ?? undefined,
      },
      slot.fromQuarantine,
    );
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
      paidAt: slot.paidNow ? nowLocalIso() : undefined,
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
    goodsOut: goodsOf(composition.goodsOut),
    goodsRelease: quarantineOf(composition.goodsRelease),
    goodsScrap: quarantineOf(composition.goodsScrap),
    moneyIn: moneyOf(composition.moneyIn),
    moneyOut: moneyOf(composition.moneyOut),
  };
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
          claimProductId: claim.productId,
          productCode: sameProduct ? claim.productCode : "",
          productName: effect.productName,
          unit: sameProduct ? claim.unit : "",
          unitPrice: effect.unitPrice ?? claim.unitPrice,
          unitCost: effect.unitCost ?? null,
          // منبعی که تصمیم ثبت کرده؛ `null` فقط برای عودت‌های قدیمیِ بی‌منبع
          // (پیش از ۲۰۲۶-۰۹-۲۷) و آزادسازی.
          source: effect.source ?? null,
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

export function summarizeReturn(returnDoc, options) {
  return summarizeEffects(allEffectsOf(returnDoc), options);
}
