/**
 * کاغذِ چاپ — اندازه، جهت و حاشیه، همه بر حسبِ میلی‌متر.
 *
 * هر برگه‌ای که در مرورگر ساخته و چاپ می‌شود (لیست قیمت‌ها، تصویرِ سندها،
 * …) کاغذش را از اینجا می‌گیرد تا گزینه‌ها و محاسبه در همه یکی باشد.
 * برچسبِ دانه هندسه‌ی خودش را دارد (`labelTemplate.js`)، چون رول و ورقِ
 * برچسب چیزِ دیگری‌اند.
 *
 * `@page size` همیشه با میلی‌مترِ صریح فرستاده می‌شود، نه نام (`A4 landscape`):
 * پرینترهای حرارتی و درایورهای قدیمی نام را نمی‌شناسند و کاغذِ پیش‌فرضِ
 * خودشان را می‌گیرند.
 */

export const PAPER_KEYS = Object.freeze({
  A3: "A3",
  A4: "A4",
  A5: "A5",
  LETTER: "Letter",
  ROLL_80: "roll-80",
  ROLL_58: "roll-58",
  CUSTOM: "custom",
});

/**
 * کاغذهای آماده. `hint` فقط برای رول است؛ بقیه اندازه‌شان را با
 * `formatPaperSize` نشان می‌دهند. رول ارتفاعِ ثابت ندارد (`heightMm: null`): ارتفاعِ صفحه
 * موقعِ چاپ از طولِ واقعیِ محتوا حساب می‌شود تا پرینترِ حرارتی کاغذِ اضافه
 * نبرد.
 */
export const PAPER_SIZES = Object.freeze([
  { key: PAPER_KEYS.A4, label: "A4", widthMm: 210, heightMm: 297 },
  { key: PAPER_KEYS.A5, label: "A5", widthMm: 148, heightMm: 210 },
  { key: PAPER_KEYS.A3, label: "A3", widthMm: 297, heightMm: 420 },
  { key: PAPER_KEYS.LETTER, label: "Letter", widthMm: 216, heightMm: 279 },
  { key: PAPER_KEYS.ROLL_80, label: "رول حرارتی ۸۰", hint: "فیش‌پرینتر", widthMm: 80, heightMm: null },
  { key: PAPER_KEYS.ROLL_58, label: "رول حرارتی ۵۸", hint: "فیش‌پرینترِ کوچک", widthMm: 58, heightMm: null },
]);

export const ORIENTATIONS = Object.freeze({ PORTRAIT: "portrait", LANDSCAPE: "landscape" });

export const ORIENTATION_LABELS = Object.freeze({
  [ORIENTATIONS.PORTRAIT]: "عمودی",
  [ORIENTATIONS.LANDSCAPE]: "افقی",
});

/** حاشیه‌های آماده؛ «دلخواه» عدد را از `customMarginMm` می‌گیرد. */
export const MARGIN_PRESETS = Object.freeze({
  NONE: "none",
  NARROW: "narrow",
  NORMAL: "normal",
  WIDE: "wide",
  CUSTOM: "custom",
});

export const MARGIN_PRESET_LABELS = Object.freeze({
  [MARGIN_PRESETS.NONE]: "بدون",
  [MARGIN_PRESETS.NARROW]: "باریک",
  [MARGIN_PRESETS.NORMAL]: "معمولی",
  [MARGIN_PRESETS.WIDE]: "پهن",
  [MARGIN_PRESETS.CUSTOM]: "دلخواه",
});

const MARGIN_MM = Object.freeze({
  [MARGIN_PRESETS.NONE]: 0,
  [MARGIN_PRESETS.NARROW]: 5,
  [MARGIN_PRESETS.NORMAL]: 12,
  [MARGIN_PRESETS.WIDE]: 20,
});

/** حاشیه‌ی رول کوچک‌تر است؛ «معمولیِ» A4 روی کاغذِ ۵۸ میلی‌متری نصفِ عرض را می‌خورد. */
const ROLL_MARGIN_MM = Object.freeze({
  [MARGIN_PRESETS.NONE]: 0,
  [MARGIN_PRESETS.NARROW]: 2,
  [MARGIN_PRESETS.NORMAL]: 4,
  [MARGIN_PRESETS.WIDE]: 6,
});

export const PAPER_LIMITS = Object.freeze({
  minWidthMm: 40,
  maxWidthMm: 500,
  minHeightMm: 40,
  maxHeightMm: 1000,
  maxMarginMm: 40,
});

/** تنظیماتِ کاغذِ پیش‌فرض؛ هر نوع برگه می‌تواند رویش بنویسد. */
export const DEFAULT_PAPER_SETTINGS = Object.freeze({
  paperKey: PAPER_KEYS.A4,
  orientation: ORIENTATIONS.PORTRAIT,
  marginPreset: MARGIN_PRESETS.NORMAL,
  customMarginMm: 10,
  customWidthMm: 210,
  customHeightMm: 297,
});

const clamp = (value, min, max, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

export const paperOf = (key) => PAPER_SIZES.find((paper) => paper.key === key) ?? null;

/** کاغذهایی که یک نوع برگه اجازه می‌دهد، به همان ترتیبِ `PAPER_SIZES`. */
export const papersFor = (keys) =>
  keys ? PAPER_SIZES.filter((paper) => keys.includes(paper.key)) : PAPER_SIZES;

/**
 * تنظیمات → هندسه‌ی صفحه.
 *
 * `contentHeightMm` برای رول `null` است (پیوسته). کاغذِ نامعتبر یا ناشناخته
 * به A4 برمی‌گردد تا تنظیمِ کهنه‌ی ذخیره‌شده صفحه را نشکند.
 */
export function pageGeometryOf(settings) {
  const isCustom = settings.paperKey === PAPER_KEYS.CUSTOM;
  const paper = isCustom ? null : (paperOf(settings.paperKey) ?? paperOf(PAPER_KEYS.A4));
  const isRoll = Boolean(paper && paper.heightMm === null);

  let widthMm = isCustom
    ? clamp(settings.customWidthMm, PAPER_LIMITS.minWidthMm, PAPER_LIMITS.maxWidthMm, 210)
    : paper.widthMm;
  let heightMm = isCustom
    ? clamp(settings.customHeightMm, PAPER_LIMITS.minHeightMm, PAPER_LIMITS.maxHeightMm, 297)
    : paper.heightMm;

  // رول جهت ندارد؛ «افقی» یعنی ضلعِ بلندتر عرض باشد (برای کاغذِ دلخواه هم).
  const orientation = isRoll ? ORIENTATIONS.PORTRAIT : settings.orientation;
  if (!isRoll && orientation === ORIENTATIONS.LANDSCAPE && heightMm > widthMm) {
    [widthMm, heightMm] = [heightMm, widthMm];
  }

  const marginTable = isRoll ? ROLL_MARGIN_MM : MARGIN_MM;
  const rawMargin =
    settings.marginPreset === MARGIN_PRESETS.CUSTOM
      ? clamp(settings.customMarginMm, 0, PAPER_LIMITS.maxMarginMm, 0)
      : (marginTable[settings.marginPreset] ?? marginTable[MARGIN_PRESETS.NORMAL]);
  // حاشیه هیچ‌وقت بیش از یک‌چهارمِ عرض نمی‌شود؛ وگرنه جایی برای محتوا نمی‌ماند.
  const marginMm = Math.min(rawMargin, Math.floor(widthMm / 4));

  return {
    paperKey: isCustom ? PAPER_KEYS.CUSTOM : paper.key,
    isRoll,
    orientation,
    widthMm,
    heightMm,
    marginMm,
    contentWidthMm: widthMm - 2 * marginMm,
    contentHeightMm: isRoll ? null : heightMm - 2 * marginMm,
  };
}

/** «۲۱۰×۲۹۷» با ارقامِ فارسی و ترتیبِ چپ‌به‌راست داخلِ متنِ راست‌به‌چپ. */
export const formatPaperSize = (widthMm, heightMm) =>
  `⁦${Math.round(widthMm).toLocaleString("fa-IR")}×${
    heightMm === null ? "پیوسته" : Math.round(heightMm).toLocaleString("fa-IR")
  }⁩`;

/** پیکسلِ CSS (۹۶dpi) → میلی‌متر. */
export const pxToMm = (px) => (px * 25.4) / 96;

/** چند صفحه برای محتوایی با این ارتفاع؛ رول همیشه یک صفحه‌ی پیوسته است. */
export const flowPageCount = (geometry, contentHeightMm) =>
  geometry.isRoll || !contentHeightMm
    ? 1
    : Math.max(1, Math.ceil(contentHeightMm / geometry.contentHeightMm - 0.001));

/**
 * گزینه‌های `usePrint` برای برگه‌ی جاری (`FlowSheet`). رول: ارتفاعِ صفحه =
 * طولِ محتوا + حاشیه، گرد به بالا تا خطِ آخر بریده نشود.
 */
export const flowPrintOptions = (geometry, contentHeightMm) => ({
  pageSize: `${geometry.widthMm}mm ${
    geometry.isRoll ? Math.ceil((contentHeightMm || 0) + 2 * geometry.marginMm + 2) : geometry.heightMm
  }mm`,
  pageMarginMm: geometry.marginMm,
});

/** گزینه‌های `usePrint` برای برگه‌هایی که صفحه‌هایشان را خودشان می‌سازند (حاشیه داخلِ صفحه). */
export const fixedPagePrintOptions = (geometry) => ({
  pageSize: `${geometry.widthMm}mm ${geometry.heightMm}mm`,
  pageMarginMm: 0,
});
