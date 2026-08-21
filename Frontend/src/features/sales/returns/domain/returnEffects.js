// src/features/sales/returns/domain/returnEffects.js

/**
 * چهار اثر پایه‌ی یک مرجوعی.
 *
 * کل بازطراحی روی همین یک ایده سوار است: تصمیم‌های مرجوعی یک فهرست
 * بسته نیستند، بلکه ترکیبی از چهار حرکتِ ممکن‌اند — کالا برود، کالا
 * بیاید، پول برود، پول بیاید. «بازگشت وجه» و «تعویض» و «اعتبار خرید»
 * همگی فقط *نام*هایی برای ترکیب‌های پرتکرارِ همین چهارتا هستند.
 *
 * سیستم قبلی چهار نوع تصمیمِ ثابت داشت و در نتیجه چیزهایی مثل «کالا
 * پیش مشتری بماند ولی پولش را بدهد» یا «کالای دیگری به‌جایش بفرست و
 * مابه‌التفاوت را بگیر» اصلاً قابل ثبت نبودند. با این مدل، کاربر سه
 * سوال ساده را جواب می‌دهد (کالا برگردد؟ کالا فرستاده شود؟ پول
 * جابه‌جا شود؟) و هر ترکیبی که لازم باشد از همین چهار اثر ساخته
 * می‌شود — بدون هیچ فهرست ثابتی که باید نگهداری شود.
 */

// ─── انواع اثر ──────────────────────────────────────────────────────────────

export const EFFECT_KINDS = {
  GOODS_IN: "goods_in",
  GOODS_OUT: "goods_out",
  MONEY_OUT: "money_out",
  MONEY_IN: "money_in",
};

export const EFFECT_KIND_LABELS = {
  [EFFECT_KINDS.GOODS_IN]: "پس‌گرفتن کالا از مشتری",
  [EFFECT_KINDS.GOODS_OUT]: "ارسال کالا برای مشتری",
  [EFFECT_KINDS.MONEY_OUT]: "پرداخت وجه به مشتری",
  [EFFECT_KINDS.MONEY_IN]: "دریافت وجه از مشتری",
};

export const EFFECT_KIND_STYLES = {
  [EFFECT_KINDS.GOODS_IN]:
    "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:border-teal-800 dark:text-teal-400",
  [EFFECT_KINDS.GOODS_OUT]:
    "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-400",
  [EFFECT_KINDS.MONEY_OUT]:
    "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-400",
  [EFFECT_KINDS.MONEY_IN]:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-400",
};

export const GOODS_EFFECT_KINDS = [
  EFFECT_KINDS.GOODS_IN,
  EFFECT_KINDS.GOODS_OUT,
];

export const MONEY_EFFECT_KINDS = [
  EFFECT_KINDS.MONEY_IN,
  EFFECT_KINDS.MONEY_OUT,
];

export function isGoodsEffect(kind) {
  return GOODS_EFFECT_KINDS.includes(kind);
}

export function isMoneyEffect(kind) {
  return MONEY_EFFECT_KINDS.includes(kind);
}

// ─── کانال پول ──────────────────────────────────────────────────────────────

/**
 * پول از چه راهی جابه‌جا می‌شود. جهتِ پول را نوعِ اثر تعیین می‌کند
 * (MONEY_IN / MONEY_OUT) و کانال فقط می‌گوید *چطور* — یعنی
 * STORE_CREDIT دیگر یک «نوع تصمیم» جدا نیست، فقط یک کانالِ MONEY_OUT
 * است. همین باعث می‌شود «اعتبار خرید بعدی» به‌طور خودکار در هر ترکیبی
 * (مثلاً همراه با پس‌گرفتن کالا) در دسترس باشد.
 */
export const MONEY_CHANNELS = {
  CASH: "cash",
  STORE_CREDIT: "store_credit",
  INVOICE_ADJUSTMENT: "invoice_adjustment",
};

export const MONEY_CHANNEL_LABELS = {
  [MONEY_CHANNELS.CASH]: "جابه‌جایی واقعی پول",
  [MONEY_CHANNELS.STORE_CREDIT]: "اعتبار خرید بعدی",
  [MONEY_CHANNELS.INVOICE_ADJUSTMENT]: "اصلاح مانده‌ی همین فاکتور",
};

/**
 * روشِ جابه‌جایی پول — همان واژگانی که فرم ثبت فروش برای پرداخت
 * استفاده می‌کند، تا کاربر دو زبان مختلف برای یک چیز نبیند.
 *
 * این با «کانال» فرق دارد و مکملش است: کانال می‌گوید پول واقعاً
 * جابه‌جا می‌شود یا فقط اعتبار ثبت می‌شود؛ روش می‌گوید آن جابه‌جاییِ
 * واقعی چطور انجام شده. برای اعتبار، روش معنا ندارد و null می‌ماند.
 */
export const PAYMENT_METHODS = {
  CASH: "cash",
  CHECK: "check",
  TRANSFER: "transfer",
};

export const PAYMENT_METHOD_LABELS = {
  [PAYMENT_METHODS.CASH]: "نقدی",
  [PAYMENT_METHODS.CHECK]: "چک",
  [PAYMENT_METHODS.TRANSFER]: "انتقال بانکی",
};

/** روش‌هایی که یک شماره‌ی پیگیری همراه دارند. */
export const REFERENCE_LABELS = {
  [PAYMENT_METHODS.CHECK]: "شماره چک",
  [PAYMENT_METHODS.TRANSFER]: "شماره پیگیری",
};

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

export const EFFECT_STATUS_LABELS = {
  [EFFECT_STATUSES.PENDING]: "در انتظار اجرا",
  [EFFECT_STATUSES.APPLIED]: "اجرا شده",
  [EFFECT_STATUSES.VOID]: "لغو شده",
};

/**
 * آیا این اثر تا وقتی انبار کاری فیزیکی نکند معلق می‌ماند؟ تنها معیارِ
 * ورود یک مرجوعی به صف‌های انبار همین است — نه وضعیت کلی مرجوعی، نه
 * نوع تصمیم.
 */
export function requiresWarehouseAction(kind) {
  return isGoodsEffect(kind);
}

export function initialStatusFor(kind) {
  return requiresWarehouseAction(kind)
    ? EFFECT_STATUSES.PENDING
    : EFFECT_STATUSES.APPLIED;
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
  channel = MONEY_CHANNELS.CASH,
  method = null,
  reference = "",
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
    channel: isGoods ? null : channel,
    method: isGoods ? null : method,
    reference: isGoods ? "" : reference || "",
    note: note || "",
    status: initialStatusFor(kind),
    history: [],
    createdAt: new Date().toISOString(),
    appliedAt: isGoods ? null : new Date().toISOString(),
  };
}

export function isEffectOpen(effect) {
  return effect?.status === EFFECT_STATUSES.PENDING;
}

export function isEffectApplied(effect) {
  return effect?.status === EFFECT_STATUSES.APPLIED;
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
