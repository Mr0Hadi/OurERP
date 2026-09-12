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

// ─── جهتِ اثر ────────────────────────────────────────────────────────────────

// همان اعضا و همان اعداد `ReturnEffectDirectionEnum`ِ بکند
// (`Domain/Enums/ReturnEffectDirectionEnum.cs`) — یک اثرِ خوانده‌شده از
// سرور بدون هیچ نگاشتی همین‌جا جا می‌افتد.
export const EFFECT_DIRECTIONS = {
  GOODS_IN: 0,
  GOODS_OUT: 1,
  MONEY_OUT: 2,
  MONEY_IN: 3,
};

const GOODS_EFFECT_DIRECTIONS = [
  EFFECT_DIRECTIONS.GOODS_IN,
  EFFECT_DIRECTIONS.GOODS_OUT,
];

export function isGoodsEffect(direction) {
  return GOODS_EFFECT_DIRECTIONS.includes(direction);
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
function initialStatusFor(direction) {
  return isGoodsEffect(direction) ? EFFECT_STATUSES.PENDING : EFFECT_STATUSES.APPLIED;
}

// ─── ساخت اثر ───────────────────────────────────────────────────────────────

const generateId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

/**
 * یک اثر تازه. `quantity` فقط کالایی است و `amount` فقط پولی، ولی هر دو
 * روی یک شکل می‌نشینند تا مصرف‌کننده دو نوع رکورد جدا نشناسد.
 *
 * `doneQuantity` مقدارِ *تجمعیِ* اجراشده است: انبار می‌تواند یک اثر
 * کالایی را چند دور جزئی اجرا کند و اثر تا رسیدنش به `quantity` در
 * PENDING می‌ماند.
 *
 * `restockedQuantity` فقط برای GOODS_IN معنا دارد و همیشه ≤
 * `doneQuantity` است — بخشی از کالای برگشتی که سالم بوده. کالای معیوب
 * هم دریافت می‌شود (ادعا بسته می‌شود) ولی به موجودیِ قابل‌فروش
 * برنمی‌گردد؛ بدون این تفکیک، پس‌گرفتنِ کالای خراب موجودی را الکی بالا
 * می‌برد.
 */
export function createEffect({
  direction,
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
  const isGoods = isGoodsEffect(direction);
  return {
    id: generateId(),
    direction,
    quantity: isGoods ? Number(quantity) || 0 : 0,
    doneQuantity: 0,
    restockedQuantity: direction === EFFECT_DIRECTIONS.GOODS_IN ? 0 : null,
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
    status: initialStatusFor(direction),
    history: [],
    createdAt: new Date().toISOString(),
    appliedAt: isGoods ? null : new Date().toISOString(),
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
 * می‌ماند: مشتری می‌گوید «معیوب بود»، انباردار می‌بیند «آسیب حمل». هر
 * کدام مقصرِ دیگری را نشان می‌دهد و گزارش به هر دو نیاز دارد. یک دور
 * می‌تواند چند مشاهده با تعدادهای جدا داشته باشد.
 */
function normalizeObservations(observations = []) {
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
    const quantity = isGoodsEffect(effect.direction)
      ? includePending
        ? Number(effect.quantity) || 0
        : Number(effect.doneQuantity) || 0
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
