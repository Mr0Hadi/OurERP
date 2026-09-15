/**
 * اثرهای پایه‌ی یک مرجوعی — مشترک بین مرجوعی فروش و مرجوعی خرید.
 *
 * تصمیم‌های مرجوعی یک فهرست بسته نیستند، بلکه ترکیبی از چند حرکتِ
 * ممکن‌اند: کالا وارد انبار ما شود، کالا از انبار ما خارج شود، پول به
 * حساب ما بیاید، پول از حساب ما برود. «بازگشت وجه» و «تعویض» و
 * «اعتبار خرید» همگی فقط *نام*هایی برای ترکیب‌های پرتکرارِ همین
 * حرکت‌ها هستند.
 *
 * جهت‌ها نسبت به *ما* تعریف شده‌اند، نه نسبت به طرف حساب — به همین
 * دلیل همین اثرها برای هر دو سمت کار می‌کنند:
 *
 *   GOODS_IN  = مشتری کالا را پس می‌دهد  |  تامین‌کننده جایگزین می‌فرستد
 *   GOODS_OUT = برای مشتری می‌فرستیم      |  به تامین‌کننده عودت می‌دهیم
 *   MONEY_IN  = مشتری پول می‌دهد          |  تامین‌کننده پول برمی‌گرداند
 *   MONEY_OUT = به مشتری پس می‌دهیم       |  به تامین‌کننده می‌پردازیم
 *
 * دو اثرِ آخر فقط در مرجوعی خرید وجود دارند و طرف حساب ندارند — کالای
 * قرنطینه‌ای که از قبل در انبار ماست تکلیفش روشن می‌شود:
 *
 *   GOODS_RELEASE = از قرنطینه به موجودیِ قابل فروش
 *   GOODS_SCRAP   = از قرنطینه به اسقاط
 *
 * تفاوت دو سمت فقط در *برچسب*هاست، نه در مدل؛ برچسب‌ها در sides.js.
 */

// ─── جهتِ اثر ────────────────────────────────────────────────────────────────

// همان اعضا و همان اعداد `ReturnEffectDirectionEnum`ِ بکند — یک اثرِ
// خوانده‌شده از سرور بدون هیچ نگاشتی همین‌جا جا می‌افتد.
export const EFFECT_DIRECTIONS = {
  GOODS_IN: 0,
  GOODS_OUT: 1,
  MONEY_OUT: 2,
  MONEY_IN: 3,
  GOODS_RELEASE: 4,
  GOODS_SCRAP: 5,
};

const GOODS_EFFECT_DIRECTIONS = [
  EFFECT_DIRECTIONS.GOODS_IN,
  EFFECT_DIRECTIONS.GOODS_OUT,
  EFFECT_DIRECTIONS.GOODS_RELEASE,
  EFFECT_DIRECTIONS.GOODS_SCRAP,
];

/** هر اثری که کالای فیزیکی جابه‌جا می‌کند و انبار باید اجرایش کند. */
export function isGoodsEffect(direction) {
  return GOODS_EFFECT_DIRECTIONS.includes(direction);
}

export function isMoneyEffect(direction) {
  return (
    direction === EFFECT_DIRECTIONS.MONEY_IN ||
    direction === EFFECT_DIRECTIONS.MONEY_OUT
  );
}

/**
 * کالایی که با طرف حساب معامله می‌شود — فقط این دو `unitPrice` دارند و
 * در قاعده‌ی تراز شمرده می‌شوند. آزادسازی و اسقاطِ قرنطینه طرف حساب
 * ندارند، پس ارزشِ معامله هم ندارند.
 */
export function isTradedGoodsEffect(direction) {
  return (
    direction === EFFECT_DIRECTIONS.GOODS_IN ||
    direction === EFFECT_DIRECTIONS.GOODS_OUT
  );
}

export function isQuarantineEffect(direction) {
  return (
    direction === EFFECT_DIRECTIONS.GOODS_RELEASE ||
    direction === EFFECT_DIRECTIONS.GOODS_SCRAP
  );
}

// ─── وضعیت اجرای اثر ────────────────────────────────────────────────────────

/**
 * هر اثر دو مرحله دارد: ثبت شدن (تصمیم گرفته شد) و اعمال شدن (واقعاً
 * اتفاق افتاد).
 *
 * - اثر کالایی همیشه `PENDING` متولد می‌شود و با دورِ انبار اجرا می‌شود.
 * - اثر مالی اگر پول همان لحظه جابه‌جا شده باشد (`paidAt`) `APPLIED`
 *   متولد می‌شود، وگرنه یک وعده است و تا ثبتِ پرداخت `PENDING` می‌ماند.
 *
 * VOID برای اثری است که پیش از اعمال لغو شده.
 */
export const EFFECT_STATUSES = {
  PENDING: 0,
  APPLIED: 1,
  VOID: 2,
};

export function isPendingMoneyEffect(effect) {
  return (
    isMoneyEffect(effect?.direction) &&
    effect?.status === EFFECT_STATUSES.PENDING
  );
}

function initialStatusFor(direction, paidAt) {
  if (isGoodsEffect(direction)) return EFFECT_STATUSES.PENDING;
  return paidAt ? EFFECT_STATUSES.APPLIED : EFFECT_STATUSES.PENDING;
}

// ─── ساخت اثر ───────────────────────────────────────────────────────────────

const generateId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

/**
 * یک اثر تازه — فقط برای پیش‌نمایشِ فرم؛ اثرِ واقعی را سرور می‌سازد.
 *
 * `quantity` فقط کالایی است و `amount` فقط مالی، ولی هر دو روی یک شکل
 * می‌نشینند تا مصرف‌کننده دو نوع رکورد جدا نشناسد. `unitPrice` فقط روی
 * کالای معامله‌شده معنا دارد و `unitCost` روی کالایی که وارد موجودی
 * می‌شود یا از قرنطینه خارج می‌شود.
 */
export function createEffect({
  direction,
  quantity = 0,
  productId = null,
  productCode = "",
  productName = "",
  unit = "",
  unitPrice = null,
  unitCost = null,
  amount = 0,
  method = null,
  reference = "",
  parts = [],
  note = "",
  paidAt = null,
}) {
  const isGoods = isGoodsEffect(direction);
  const status = initialStatusFor(direction, paidAt);
  return {
    id: generateId(),
    direction,
    quantity: isGoods ? Number(quantity) || 0 : 0,
    appliedQuantity: 0,
    restockedQuantity: direction === EFFECT_DIRECTIONS.GOODS_IN ? 0 : null,
    productId: isGoods ? productId : null,
    productCode: isGoods ? productCode : "",
    productName: isGoods ? productName : "",
    unit: isGoods ? unit : "",
    unitPrice: isTradedGoodsEffect(direction) ? unitPrice : null,
    unitCost: isGoods ? unitCost : null,
    amount: isGoods ? 0 : Number(amount) || 0,
    method: isGoods ? null : method,
    reference: isGoods ? "" : reference || "",
    parts: isGoods ? [] : parts,
    note: note || "",
    status,
    history: [],
    appliedAt: status === EFFECT_STATUSES.APPLIED ? paidAt : null,
  };
}

// ─── دورِ اجرای یک اثر کالایی ───────────────────────────────────────────────

/**
 * هر دورِ اجرا یک ردیف در `effect.history` است:
 *
 *   { id, date, quantity,
 *     healthyQuantity,  // فقط GOODS_IN؛ quantity منهای مجموع مشاهده‌ها
 *     observations: [{ problem, quantity, note }],
 *     partyName, partyNationalId, vehiclePlate, note }
 *
 * `observations` مشاهده‌ی انباردار است و عمداً جدا از ادعای طرف حساب
 * می‌ماند: مشتری می‌گوید «معیوب بود»، انباردار می‌بیند «آسیب حمل».
 */
function normalizeObservations(observations = []) {
  return observations
    .map((observation) => ({
      problem: observation.problem ?? null,
      quantity: Number(observation.quantity) || 0,
      note: observation.note || "",
    }))
    // `problem` یک enum عددی است و عضو اولش صفر — بررسی باید صریح باشد.
    .filter((observation) => observation.problem !== null && observation.quantity > 0);
}

/** مشاهده‌های همه‌ی دورهای یک اثر، تجمیع‌شده روی نوع مشکل. */
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
 * جمعِ اثرها از دید *شرکت*: netMoney مثبت یعنی این مرجوعی در مجموع پول
 * به شرکت رسانده، منفی یعنی از شرکت خارج کرده.
 *
 * پیش‌فرض فقط اثرهای اعمال‌شده شمرده می‌شوند (تصویر واقعیت). برای
 * پیش‌نمایشِ «اگر این تصمیم ثبت شود چه می‌شود» باید includePending را
 * true داد. آزادسازی و اسقاطِ قرنطینه کالا را جابه‌جا نمی‌کنند که به
 * طرف حساب برسد، پس در این جمع نیستند.
 */
export function summarizeEffects(effects = [], { includePending = false } = {}) {
  const acc = effects.reduce((sum, effect) => {
    if (effect.status === EFFECT_STATUSES.VOID) return sum;

    const pending = effect.status === EFFECT_STATUSES.PENDING;
    if (pending) sum.pendingCount += 1;
    if (pending && !includePending) return sum;

    const quantity = isGoodsEffect(effect.direction)
      ? includePending
        ? Number(effect.quantity) || 0
        : Number(effect.appliedQuantity) || 0
      : 0;

    switch (effect.direction) {
      case EFFECT_DIRECTIONS.GOODS_IN:
        sum.goodsInQuantity += quantity;
        break;
      case EFFECT_DIRECTIONS.GOODS_OUT:
        sum.goodsOutQuantity += quantity;
        break;
      case EFFECT_DIRECTIONS.MONEY_IN:
        sum.moneyIn += Number(effect.amount) || 0;
        break;
      case EFFECT_DIRECTIONS.MONEY_OUT:
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
