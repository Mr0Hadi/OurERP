// src/shared/domain/returns/effects.js

import { PaymentTypeEnum } from "@/shared/domain/enums/paymentType";

/**
 * چهار اثر پایه‌ی یک مرجوعی — مشترک بین مرجوعی فروش و مرجوعی خرید.
 *
 * تصمیم‌های مرجوعی یک فهرست بسته نیستند، بلکه ترکیبی از چهار حرکتِ
 * ممکن‌اند: کالا وارد انبار ما شود، کالا از انبار ما خارج شود، پول به
 * حساب ما بیاید، پول از حساب ما برود. «بازگشت وجه» و «تعویض» و
 * «اعتبار خرید» همگی فقط *نام*هایی برای ترکیب‌های پرتکرارِ همین
 * چهارتا هستند.
 *
 * جهت‌ها نسبت به *ما* تعریف شده‌اند، نه نسبت به طرف حساب — به همین
 * دلیل همین چهار اثر برای هر دو سمت کار می‌کند:
 *
 *   GOODS_IN  = مشتری کالا را پس می‌دهد  |  تامین‌کننده جایگزین می‌فرستد
 *   GOODS_OUT = برای مشتری می‌فرستیم      |  به تامین‌کننده عودت می‌دهیم
 *   MONEY_IN  = مشتری پول می‌دهد          |  تامین‌کننده پول برمی‌گرداند
 *   MONEY_OUT = به مشتری پس می‌دهیم       |  به تامین‌کننده می‌پردازیم
 *
 * تفاوت دو سمت فقط در *برچسب*هاست، نه در مدل؛ برچسب‌ها در sides.js.
 */

// ─── انواع اثر ──────────────────────────────────────────────────────────────

// بدون معادل در بکند — مدلِ ترکیبیِ خودِ فرانت است، نه یک enum بسته.
export const EFFECT_KINDS = {
  GOODS_IN: 0,
  GOODS_OUT: 1,
  MONEY_OUT: 2,
  MONEY_IN: 3,
};

const GOODS_EFFECT_KINDS = [
  EFFECT_KINDS.GOODS_IN,
  EFFECT_KINDS.GOODS_OUT,
];

export function isGoodsEffect(kind) {
  return GOODS_EFFECT_KINDS.includes(kind);
}

// ─── روش جابه‌جایی پول ──────────────────────────────────────────────────────

/**
 * پول از چه راهی جابه‌جا می‌شود — همان `PaymentTypeEnum`ِ سند.
 *
 * قبلاً این مفهوم بین سه چیز پخش بود («جهت»، «کانال»، «روش») و بعد از
 * یکی‌شدنشان باز هم یک شمارشِ جداگانه (`PAYMENT_METHODS`) مانده بود که
 * فقط شماره‌هایش با سطحِ سند فرق داشت. حالا فقط دو محور مانده: *جهت*
 * (پول به کدام سمت می‌رود — در returnResolutions) و *روش* (از چه
 * راهی)، و روش همان واژگانِ فرمِ خرید/فروش است.
 */

/**
 * آیا این روش، ارزشِ همین فاکتور را تغییر می‌دهد؟
 *
 * «اعتبار خرید بعدی» تعهدی برای فروشِ *بعدی* است، نه اصلاحی روی این
 * فاکتور — تنها روشی که مبلغ فاکتور را تکان نمی‌دهد. «نسیه» برعکس،
 * همین فاکتور را جابه‌جا می‌کند و فقط زمانِ تسویه‌اش عقب می‌افتد.
 */
export function affectsInvoiceTotal(method) {
  return method !== PaymentTypeEnum.STORE_CREDIT;
}

// ─── وضعیت اجرای اثر ────────────────────────────────────────────────────────

/**
 * هر اثر دو مرحله دارد: ثبت شدن (تصمیم گرفته شد) و اعمال شدن (واقعاً
 * اتفاق افتاد). اثرهای کالایی حتماً از PENDING شروع می‌شوند چون
 * منتظر یک اقدام فیزیکی در انبارند؛ اثرهای پولی همان لحظه‌ی ثبت
 * اعمال‌شده حساب می‌شوند، چون ثبتشان توسط واحد فروش خودش همان اقدام
 * مالی است.
 *
 * VOID برای اثری است که پیش از اعمال لغو شده — پاک نمی‌شود تا رد
 * تصمیم‌های عوض‌شده در تاریخچه بماند.
 */
// بدون معادل یک‌به‌یک در بکند — PurchaseReturnDecisionStatusEnum/
// SaleReturnDecisionStatusEnum فقط دو عضو دارند (AWAITING/RESOLVED)،
// این سه‌تا دارد (VOID معادل ندارد).
export const EFFECT_STATUSES = {
  PENDING: 0,
  APPLIED: 1,
  VOID: 2,
};

/**
 * اثرهای کالایی تا وقتی انبار کاری فیزیکی نکند معلق می‌مانند — تنها
 * معیارِ ورود یک مرجوعی به صف‌های انبار همین است، نه وضعیت کلی مرجوعی.
 * اثرهای پولی همان لحظه‌ی ثبت اعمال‌شده حساب می‌شوند.
 */
function initialStatusFor(kind) {
  return isGoodsEffect(kind) ? EFFECT_STATUSES.PENDING : EFFECT_STATUSES.APPLIED;
}

// ─── ساخت اثر ───────────────────────────────────────────────────────────────

const generateId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

/**
 * یک اثر تازه. quantity فقط برای اثرهای کالایی معنا دارد و amount فقط برای
 * اثرهای پولی؛ عمداً هر دو روی یک شکل نگه داشته می‌شوند تا مصرف‌کننده
 * لازم نباشد دو نوع رکورد جدا بشناسد.
 *
 * doneQuantity مقدارِ *تجمعیِ* اجراشده است. برای اثرهای کالایی، انبار
 * می‌تواند چند دور جزئی اجرا کند و اثر تا رسیدن doneQuantity به quantity در
 * PENDING می‌ماند — همان قراردادی که ارسال جایگزین و دریافت مرجوعی
 * از قبل داشتند، فقط حالا یکسان‌شده برای هر دو جهت.
 *
 * restockedQuantity فقط برای GOODS_IN معنا دارد و همیشه ≤ doneQuantity است:
 * بخشی از کالای برگشتی که سالم بوده و به موجودی قابل‌فروش برگشته.
 * کالای معیوبِ برگشتی هم دریافت می‌شود (doneQuantity بالا می‌رود، ادعا
 * بسته می‌شود) ولی وارد موجودی نمی‌شود. بدون این تفکیک، پس‌گرفتنِ
 * کالای خراب موجودیِ قابل‌فروش را الکی بالا می‌برد.
 */
export function createEffect({
  kind,
  quantity = 0,
  productId = null,
  productCode = "",
  productName = "",
  unit = "",
  amount = 0,
  method = null,
  reference = "",
  parts = [],
  note = "",
}) {
  const isGoods = isGoodsEffect(kind);
  return {
    id: generateId(),
    kind,
    quantity: isGoods ? Number(quantity) || 0 : 0,
    doneQuantity: 0,
    restockedQuantity: kind === EFFECT_KINDS.GOODS_IN ? 0 : null,
    productId: isGoods ? productId : null,
    productCode: isGoods ? productCode : "",
    productName: isGoods ? productName : "",
    unit: isGoods ? unit : "",
    amount: isGoods ? 0 : Number(amount) || 0,
    method: isGoods ? null : method,
    reference: isGoods ? "" : reference || "",
    // فقط برای روشِ ترکیبی پر می‌شود؛ مجموعِ مبالغش همان amount است.
    parts: isGoods ? [] : parts,
    note: note || "",
    status: initialStatusFor(kind),
    history: [],
    createdAt: new Date().toISOString(),
    appliedAt: isGoods ? null : new Date().toISOString(),
  };
}

// ─── دورِ اجرای یک اثر کالایی ───────────────────────────────────────────────

/**
 * هر بار که انبار بخشی از یک اثر کالایی را اجرا می‌کند، یک ردیف در
 * `effect.history` می‌نشیند:
 *
 *   {
 *     id, date, quantity,
 *     healthyQuantity,              // فقط GOODS_IN؛ = quantity منهای مجموع مشاهده‌ها
 *     observations: [          // مشاهده‌ی مستقلِ انباردار
 *       { problem, quantity, note }
 *     ],
 *     partyName, partyNationalId, vehiclePlate, note
 *   }
 *
 * `observations` جانشینِ `issueProblem`/`issueNote`ِ قبلی است. آن دو
 * فقط *یک* مشکل و *یک* یادداشت برای کل دور نگه می‌داشتند، در حالی که
 * فرمِ انبار از روز اول می‌توانست چند ردیف مشکل با تعدادهای جدا ثبت
 * کند — یعنی داده در همان مرزِ ورودی تخریب می‌شد. بدتر اینکه سمت خرید
 * اصلاً این دو فیلد را پر نمی‌کرد.
 *
 * چرا مشاهده جدا از ادعا نگه داشته می‌شود: مشتری می‌گوید «معیوب بود»،
 * انباردار می‌بیند «آسیب حمل». هر کدام یک مقصرِ متفاوت را نشان می‌دهد
 * و برای گزارش‌گیری باید هر دو بمانند.
 */
export function normalizeObservations(observations = []) {
  return observations
    .map((observation) => ({
      problem: observation.problem ?? null,
      quantity: Number(observation.quantity) || 0,
      note: observation.note || "",
    }))
    // `problem` یک enum عددی است و عضو اولش صفر — پس بررسی باید صریح
    // باشد، وگرنه مشاهده‌ی «کالای اشتباه ارسال شد» (۰) بی‌صدا حذف می‌شود.
    .filter((observation) => observation.problem !== null && observation.quantity > 0);
}

/** مجموع تعدادی که در یک دور «مشکل‌دار» گزارش شده. */
export function observedQuantityOf(observations = []) {
  return normalizeObservations(observations).reduce(
    (sum, observation) => sum + observation.quantity,
    0,
  );
}

/**
 * مشاهده‌های همه‌ی دورهای یک اثر، تجمیع‌شده روی نوع مشکل.
 *
 * همان چیزی که گزارشِ «چقدر از کالای برگشتی واقعاً معیوب بود» به آن
 * نیاز دارد؛ بدون این، باید در `history` هر اثر جداگانه گشت.
 */
export function observationsOf(effect) {
  const totals = new Map();

  (effect?.history || []).forEach((round) => {
    normalizeObservations(round.observations).forEach((observation) => {
      const current = totals.get(observation.problem) || { quantity: 0, notes: [] };
      current.quantity += observation.quantity;
      if (observation.note) current.notes.push(observation.note);
      totals.set(observation.problem, current);
    });
  });

  return [...totals.entries()].map(([problem, { quantity, notes }]) => ({
    problem,
    quantity,
    note: notes.join(" / "),
  }));
}

/** مقداری از یک اثر کالایی که هنوز اجرا نشده. */
export function remainingQuantityOf(effect) {
  if (!isGoodsEffect(effect?.kind)) return 0;
  return Math.max(0, (Number(effect.quantity) || 0) - (Number(effect.doneQuantity) || 0));
}

// ─── جمع‌بندی ───────────────────────────────────────────────────────────────

const EMPTY_SUMMARY = {
  goodsInQuantity: 0,
  goodsOutQuantity: 0,
  moneyIn: 0,
  moneyOut: 0,
  netMoney: 0,
  pendingCount: 0,
};

/**
 * جمعِ اثرها از دید *شرکت*: netMoney مثبت یعنی این مرجوعی در مجموع
 * پول به شرکت رسانده، منفی یعنی از شرکت خارج کرده.
 *
 * پیش‌فرض فقط اثرهای اعمال‌شده شمرده می‌شوند (تصویر واقعیت). برای
 * پیش‌نمایشِ «اگر این تصمیم ثبت شود چه می‌شود» باید
 * includePending را true داد.
 */
export function summarizeEffects(effects = [], { includePending = false } = {}) {
  const acc = effects.reduce((sum, effect) => {
    if (effect.status === EFFECT_STATUSES.VOID) return sum;

    const pending = effect.status === EFFECT_STATUSES.PENDING;
    if (pending) sum.pendingCount += 1;
    if (pending && !includePending) return sum;

    // برای اثر کالاییِ در حال اجرا، آنچه واقعاً حرکت کرده doneQuantity است
    // نه quantity؛ مگر اینکه پیش‌نمایشِ کاملِ تصمیم خواسته شده باشد.
    const quantity = isGoodsEffect(effect.kind)
      ? includePending
        ? Number(effect.quantity) || 0
        : Number(effect.doneQuantity) || 0
      : 0;

    switch (effect.kind) {
      case EFFECT_KINDS.GOODS_IN:
        sum.goodsInQuantity += quantity;
        break;
      case EFFECT_KINDS.GOODS_OUT:
        sum.goodsOutQuantity += quantity;
        break;
      case EFFECT_KINDS.MONEY_IN:
        sum.moneyIn += Number(effect.amount) || 0;
        break;
      case EFFECT_KINDS.MONEY_OUT:
        sum.moneyOut += Number(effect.amount) || 0;
        break;
      default:
        break;
    }
    return sum;
  }, { ...EMPTY_SUMMARY });

  acc.netMoney = acc.moneyIn - acc.moneyOut;
  return acc;
}

/**
 * حرکت خالص موجودی به تفکیک کالا — کلیدِ محصول به دلتا.
 *
 * این همان چیزی است که موتور اثر (مرحله‌ی بعد) به adjustProductsStock
 * می‌دهد. جدا نگه داشتنش از summarizeEffects عمدی است: تعدادِ کالا
 * وقتی کالای ورودی و خروجی یکی نیستند (تعویض با کالای دیگر) قابل جمع
 * زدن در یک عدد نیست.
 *
 * برای GOODS_IN مبنا restockedQuantity است نه doneQuantity — فقط بخش سالمِ
 * کالای برگشتی به موجودی قابل‌فروش برمی‌گردد. در حالت پیش‌نمایش
 * (includePending) هنوز معلوم نیست چقدرش سالم است، پس خوش‌بینانه کل
 * quantity فرض می‌شود؛ این عدد فقط برای نمایش به کاربر است و هرگز به
 * موجودی واقعی اعمال نمی‌شود.
 */
export function stockDeltasOf(effects = [], { includePending = false } = {}) {
  const deltas = new Map();
  effects.forEach((effect) => {
    if (!isGoodsEffect(effect.kind)) return;
    if (effect.status === EFFECT_STATUSES.VOID) return;
    if (effect.status === EFFECT_STATUSES.PENDING && !includePending) return;
    if (effect.productId == null) return;

    const isIn = effect.kind === EFFECT_KINDS.GOODS_IN;
    const quantity = includePending
      ? Number(effect.quantity) || 0
      : isIn
        ? Number(effect.restockedQuantity) || 0
        : Number(effect.doneQuantity) || 0;
    if (quantity <= 0) return;

    const sign = isIn ? 1 : -1;
    deltas.set(effect.productId, (deltas.get(effect.productId) || 0) + sign * quantity);
  });

  return [...deltas.entries()]
    .filter(([, delta]) => delta !== 0)
    .map(([productId, delta]) => ({ productId, delta }));
}
