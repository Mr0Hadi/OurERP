// src/shared/domain/returns/effects.js

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

export const EFFECT_KINDS = {
  GOODS_IN: "goods_in",
  GOODS_OUT: "goods_out",
  MONEY_OUT: "money_out",
  MONEY_IN: "money_in",
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
 * پول از چه راهی جابه‌جا می‌شود.
 *
 * قبلاً این مفهوم بین سه چیز پخش بود — «جهت» (که CREDIT هم داخلش بود)،
 * «کانال»، و «روش». هر سه یک سوال را از سه زاویه می‌پرسیدند و دو تا از
 * سه مقدارِ کانال یا بی‌مصرف بودند یا تکرارِ جهت. حالا فقط دو محور
 * مانده: *جهت* (پول به کدام سمت می‌رود — در returnResolutions) و
 * *روش* (از چه راهی). همین یک لیست، همان واژگانی است که فرم ثبت فروش
 * برای پرداخت استفاده می‌کند.
 */
export const PAYMENT_METHODS = {
  CASH: "cash",
  CHECK: "check",
  TRANSFER: "transfer",
  ON_ACCOUNT: "on_account",
  STORE_CREDIT: "store_credit",
  MIXED: "mixed",
};

export const PAYMENT_METHOD_LABELS = {
  [PAYMENT_METHODS.CASH]: "نقدی",
  [PAYMENT_METHODS.CHECK]: "چک",
  [PAYMENT_METHODS.TRANSFER]: "انتقال بانکی",
  [PAYMENT_METHODS.ON_ACCOUNT]: "نسیه (روی حساب مشتری)",
  [PAYMENT_METHODS.STORE_CREDIT]: "اعتبار خرید بعدی",
  [PAYMENT_METHODS.MIXED]: "ترکیبی",
};

/** روش‌هایی که یک شماره‌ی پیگیری همراه دارند. */
export const REFERENCE_LABELS = {
  [PAYMENT_METHODS.CHECK]: "شماره چک",
  [PAYMENT_METHODS.TRANSFER]: "شماره پیگیری",
};

/**
 * روش‌هایی که می‌توانند جزءِ یک پرداخت ترکیبی باشند. «نسیه» و «اعتبار»
 * اینجا نیستند چون خودشان یعنی «الان پولی جابه‌جا نمی‌شود» — تکه‌کردنشان
 * بی‌معناست.
 */
export const SPLITTABLE_PAYMENT_METHODS = [
  PAYMENT_METHODS.CASH,
  PAYMENT_METHODS.CHECK,
  PAYMENT_METHODS.TRANSFER,
];

/**
 * آیا این روش، ارزشِ همین فاکتور را تغییر می‌دهد؟
 *
 * «اعتبار خرید بعدی» تعهدی برای فروشِ *بعدی* است، نه اصلاحی روی این
 * فاکتور — تنها روشی که مبلغ فاکتور را تکان نمی‌دهد. «نسیه» برعکس،
 * همین فاکتور را جابه‌جا می‌کند و فقط زمانِ تسویه‌اش عقب می‌افتد.
 */
export function affectsInvoiceTotal(method) {
  return method !== PAYMENT_METHODS.STORE_CREDIT;
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
export const EFFECT_STATUSES = {
  PENDING: "pending",
  APPLIED: "applied",
  VOID: "void",
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
 * یک اثر تازه. qty فقط برای اثرهای کالایی معنا دارد و amount فقط برای
 * اثرهای پولی؛ عمداً هر دو روی یک شکل نگه داشته می‌شوند تا مصرف‌کننده
 * لازم نباشد دو نوع رکورد جدا بشناسد.
 *
 * doneQty مقدارِ *تجمعیِ* اجراشده است. برای اثرهای کالایی، انبار
 * می‌تواند چند دور جزئی اجرا کند و اثر تا رسیدن doneQty به qty در
 * PENDING می‌ماند — همان قراردادی که ارسال جایگزین و دریافت مرجوعی
 * از قبل داشتند، فقط حالا یکسان‌شده برای هر دو جهت.
 *
 * restockedQty فقط برای GOODS_IN معنا دارد و همیشه ≤ doneQty است:
 * بخشی از کالای برگشتی که سالم بوده و به موجودی قابل‌فروش برگشته.
 * کالای معیوبِ برگشتی هم دریافت می‌شود (doneQty بالا می‌رود، ادعا
 * بسته می‌شود) ولی وارد موجودی نمی‌شود. بدون این تفکیک، پس‌گرفتنِ
 * کالای خراب موجودیِ قابل‌فروش را الکی بالا می‌برد.
 */
export function createEffect({
  kind,
  qty = 0,
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
    qty: isGoods ? Number(qty) || 0 : 0,
    doneQty: 0,
    restockedQty: kind === EFFECT_KINDS.GOODS_IN ? 0 : null,
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

/** مقداری از یک اثر کالایی که هنوز اجرا نشده. */
export function remainingQtyOf(effect) {
  if (!isGoodsEffect(effect?.kind)) return 0;
  return Math.max(0, (Number(effect.qty) || 0) - (Number(effect.doneQty) || 0));
}

// ─── جمع‌بندی ───────────────────────────────────────────────────────────────

const EMPTY_SUMMARY = {
  goodsInQty: 0,
  goodsOutQty: 0,
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

    // برای اثر کالاییِ در حال اجرا، آنچه واقعاً حرکت کرده doneQty است
    // نه qty؛ مگر اینکه پیش‌نمایشِ کاملِ تصمیم خواسته شده باشد.
    const qty = isGoodsEffect(effect.kind)
      ? includePending
        ? Number(effect.qty) || 0
        : Number(effect.doneQty) || 0
      : 0;

    switch (effect.kind) {
      case EFFECT_KINDS.GOODS_IN:
        sum.goodsInQty += qty;
        break;
      case EFFECT_KINDS.GOODS_OUT:
        sum.goodsOutQty += qty;
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
 * برای GOODS_IN مبنا restockedQty است نه doneQty — فقط بخش سالمِ
 * کالای برگشتی به موجودی قابل‌فروش برمی‌گردد. در حالت پیش‌نمایش
 * (includePending) هنوز معلوم نیست چقدرش سالم است، پس خوش‌بینانه کل
 * qty فرض می‌شود؛ این عدد فقط برای نمایش به کاربر است و هرگز به
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
    const qty = includePending
      ? Number(effect.qty) || 0
      : isIn
        ? Number(effect.restockedQty) || 0
        : Number(effect.doneQty) || 0;
    if (qty <= 0) return;

    const sign = isIn ? 1 : -1;
    deltas.set(effect.productId, (deltas.get(effect.productId) || 0) + sign * qty);
  });

  return [...deltas.entries()]
    .filter(([, delta]) => delta !== 0)
    .map(([productId, delta]) => ({ productId, delta }));
}
