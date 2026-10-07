/**
 * قالبِ برچسبِ دانه — «روی برچسب چه باشد و چه اندازه‌ای».
 *
 * تنظیمات به پرینتر و اسکنرِ انبار بستگی دارند، نه به یک دسته‌ی خاص؛ پس
 * بینِ نشست‌ها می‌مانند (`useLabelTemplateStore`). همه‌ی اندازه‌ها میلی‌متر.
 */

// ─── اندازه‌ی برچسب ─────────────────────────────────────────────────────────

/** چیدمان: رول (هر برچسب یک صفحه، پرینترِ برچسب) یا ورقِ A4 (چند برچسب در صفحه). */
export const LABEL_LAYOUTS = Object.freeze({ ROLL: "roll", SHEET: "sheet" });

export const LABEL_LAYOUT_LABELS = Object.freeze({
  [LABEL_LAYOUTS.ROLL]: "رول (پرینتر برچسب)",
  [LABEL_LAYOUTS.SHEET]: "ورق A4",
});

/**
 * «عرض×ارتفاع» با ارقام فارسی. داخلِ متنِ راست‌به‌چپ، عدد و «×» ترتیبشان
 * برعکس دیده می‌شود (۳۳×۶۲)؛ جداسازیِ چپ‌به‌راست (LRI…PDI) ترتیب را نگه می‌دارد.
 */
export const formatLabelSize = (widthMm, heightMm) =>
  `\u2066${Number(widthMm).toLocaleString("fa-IR")}×${Number(heightMm).toLocaleString("fa-IR")}\u2069`;

/** اندازه‌های رایج؛ «سفارشی» عرض و ارتفاع را دستی می‌گیرد. */
export const LABEL_SIZE_PRESETS = Object.freeze([
  { key: "roll-40x25", label: `رول ${formatLabelSize(40, 25)}`, layout: LABEL_LAYOUTS.ROLL, widthMm: 40, heightMm: 25 },
  { key: "roll-50x30", label: `رول ${formatLabelSize(50, 30)}`, layout: LABEL_LAYOUTS.ROLL, widthMm: 50, heightMm: 30 },
  { key: "roll-60x40", label: `رول ${formatLabelSize(60, 40)}`, layout: LABEL_LAYOUTS.ROLL, widthMm: 60, heightMm: 40 },
  { key: "roll-100x50", label: `رول ${formatLabelSize(100, 50)}`, layout: LABEL_LAYOUTS.ROLL, widthMm: 100, heightMm: 50 },
  { key: "sheet-62x33", label: `ورقِ A4 با ۲۴ برچسبِ ${formatLabelSize(62, 33)}`, layout: LABEL_LAYOUTS.SHEET, widthMm: 62, heightMm: 33 },
  { key: "sheet-93x53", label: `ورقِ A4 با ۱۰ برچسبِ ${formatLabelSize(93, 53)}`, layout: LABEL_LAYOUTS.SHEET, widthMm: 93, heightMm: 53 },
]);

export const CUSTOM_SIZE_KEY = "custom";

/** مرزهای عملی: کوچک‌تر از این، بارکدِ ۲۸ رقمیِ دانه دیگر خوانا نیست. */
export const LABEL_SIZE_LIMITS = Object.freeze({
  minWidthMm: 30,
  maxWidthMm: 150,
  minHeightMm: 15,
  maxHeightMm: 100,
});

const A4 = { widthMm: 210, heightMm: 297, marginMm: 8, gapMm: 2 };

/** چند برچسب کنار هم روی رول؛ سقفِ انتخاب در UI (جا شدن را اعتبارسنجی تعیین می‌کند). */
export const MAX_LABELS_PER_ROW = 8;
export const LABEL_GAP_LIMITS = Object.freeze({ minMm: 0, maxMm: 20 });
export const MEDIA_WIDTH_LIMITS = Object.freeze({ minMm: 20, maxMm: 300 });

const round1 = (value) => Math.round(value * 10) / 10;

/** عرضِ لازم = n×عرضِ برچسب + (n-1)×فاصله. با n=۱ فاصله بی‌اثر است. */
export const requiredWidthMm = (labelWidthMm, labelsPerRow, gapMm) =>
  round1(labelWidthMm * labelsPerRow + gapMm * (labelsPerRow - 1));

/** بیشترین تعدادِ برچسبِ کنار هم که در عرضِ رسانه جا می‌شود (حداقل ۱). */
export const maxLabelsPerRow = (labelWidthMm, gapMm, mediaWidthMm) =>
  Math.max(1, Math.floor((mediaWidthMm + gapMm) / (labelWidthMm + gapMm)));

const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value) || min));

/**
 * قالب → هندسه‌ی صفحه‌ای که `LabelSheet` می‌فهمد.
 *
 * رول: هر برچسب یک صفحه به اندازه‌ی خودش. ورق: تعدادِ ستون و ردیف از
 * اندازه‌ی برچسب روی A4 حساب می‌شود تا هیچ ستونی از کاغذ بیرون نیفتد.
 */
export function sheetGeometryOf(template) {
  const preset = LABEL_SIZE_PRESETS.find((item) => item.key === template.sizeKey);
  const layout = preset?.layout ?? template.custom.layout;
  const widthMm = clamp(
    preset?.widthMm ?? template.custom.widthMm,
    LABEL_SIZE_LIMITS.minWidthMm,
    LABEL_SIZE_LIMITS.maxWidthMm,
  );
  const heightMm = clamp(
    preset?.heightMm ?? template.custom.heightMm,
    LABEL_SIZE_LIMITS.minHeightMm,
    LABEL_SIZE_LIMITS.maxHeightMm,
  );

  if (layout === LABEL_LAYOUTS.ROLL) {
    // قالب‌های قدیمیِ ذخیره‌شده این فیلدها را ندارند → ۱ برچسب، همان رفتارِ قبلی.
    const labelsPerRow = Math.min(
      MAX_LABELS_PER_ROW,
      Math.max(1, Math.round(Number(template.labelsPerRow)) || 1),
    );
    const gapMm =
      labelsPerRow === 1
        ? 0
        : clamp(template.horizontalGapMm ?? 0, LABEL_GAP_LIMITS.minMm, LABEL_GAP_LIMITS.maxMm);
    const requiredMm = requiredWidthMm(widthMm, labelsPerRow, gapMm);
    // رسانه‌ی خالی/نامعتبر = «به اندازه‌ی لازم» (رفتارِ قبلی برای تک‌برچسب).
    const mediaInput = Number(template.mediaWidthMm);
    const hasMedia = labelsPerRow > 1 && Number.isFinite(mediaInput) && mediaInput > 0;
    const mediaMm = hasMedia ? mediaInput : requiredMm;
    const fits = requiredMm <= mediaMm;

    return {
      layout,
      pageSize: `${mediaMm}mm ${heightMm}mm`,
      pageWidthMm: mediaMm,
      pageHeightMm: heightMm,
      pageMarginMm: 0,
      columns: labelsPerRow,
      rows: 1,
      perPage: labelsPerRow,
      labelWidthMm: widthMm,
      labelHeightMm: heightMm,
      gapMm,
      labelsPerRow,
      requiredWidthMm: requiredMm,
      mediaWidthMm: mediaMm,
      remainingWidthMm: round1(mediaMm - requiredMm),
      maxLabelsPerRow: hasMedia ? maxLabelsPerRow(widthMm, gapMm, mediaMm) : MAX_LABELS_PER_ROW,
      error: fits ? null : "overflow",
    };
  }

  const usableWidth = A4.widthMm - 2 * A4.marginMm;
  const usableHeight = A4.heightMm - 2 * A4.marginMm;
  const columns = Math.max(1, Math.floor((usableWidth + A4.gapMm) / (widthMm + A4.gapMm)));
  const rows = Math.max(1, Math.floor((usableHeight + A4.gapMm) / (heightMm + A4.gapMm)));

  return {
    layout,
    pageSize: "A4",
    pageWidthMm: A4.widthMm,
    pageHeightMm: A4.heightMm,
    pageMarginMm: A4.marginMm,
    columns,
    rows,
    perPage: columns * rows,
    labelWidthMm: widthMm,
    labelHeightMm: heightMm,
    gapMm: A4.gapMm,
    error: null,
  };
}

// ─── نماد ───────────────────────────────────────────────────────────────────

/** هر دو همان `barcode` را حمل می‌کنند؛ فقط شکلِ نماد فرق دارد. */
export const LABEL_CODE_TYPES = Object.freeze({ BARCODE: "barcode", QR: "qr" });

export const LABEL_CODE_TYPE_LABELS = Object.freeze({
  [LABEL_CODE_TYPES.BARCODE]: "بارکد خطی",
  [LABEL_CODE_TYPES.QR]: "کد QR",
});

/** بزرگیِ نماد نسبت به برچسب؛ بقیه‌ی جا مالِ متن است. */
export const LABEL_SCALES = Object.freeze({ SMALL: "small", MEDIUM: "medium", LARGE: "large" });

export const LABEL_SCALE_LABELS = Object.freeze({
  [LABEL_SCALES.SMALL]: "کوچک",
  [LABEL_SCALES.MEDIUM]: "متوسط",
  [LABEL_SCALES.LARGE]: "بزرگ",
});

/** سهمِ نماد از ارتفاع (بارکد) یا از عرض (QR). */
export const CODE_SHARE = Object.freeze({
  [LABEL_SCALES.SMALL]: 0.4,
  [LABEL_SCALES.MEDIUM]: 0.55,
  [LABEL_SCALES.LARGE]: 0.7,
});

/** اندازه‌ی قلمِ متن‌ها بر حسبِ pt. */
export const FONT_SIZES_PT = Object.freeze({
  [LABEL_SCALES.SMALL]: 6,
  [LABEL_SCALES.MEDIUM]: 7.5,
  [LABEL_SCALES.LARGE]: 9,
});

/** اندازه‌ی دقیقِ متن (pt)؛ خارج از این بازه یا نامعتبر = همان اندازه‌ی پیش‌فرضِ `fontScale`. */
export const FONT_SIZE_LIMITS = Object.freeze({ minPt: 4, maxPt: 16 });

export const isValidFontSizePt = (value) => {
  const n = Number(value);
  return value !== null && value !== "" && Number.isFinite(n) && n >= FONT_SIZE_LIMITS.minPt && n <= FONT_SIZE_LIMITS.maxPt;
};

/** اندازه‌ی مؤثرِ متن: مقدارِ دقیقِ معتبر، وگرنه پیش‌تنظیمِ کوچک/متوسط/بزرگ. */
export const labelFontPt = (template) =>
  isValidFontSizePt(template.fontSizePt)
    ? Number(template.fontSizePt)
    : (FONT_SIZES_PT[template.fontScale] ?? FONT_SIZES_PT.medium);

// ─── متن‌های روی برچسب ──────────────────────────────────────────────────────

/**
 * متن‌هایی که می‌شود روی برچسب گذاشت. طرفِ حساب فقط وقتی چاپ می‌شود که
 * دانه آن را دارد: تامین‌کننده برای دانه‌ای که با خرید آمده، مشتری برای
 * دانه‌ای که با فروش رفته.
 */
export const LABEL_FIELDS = Object.freeze([
  { key: "productName", label: "نام کالا" },
  { key: "codeText", label: "شماره‌ی بارکد (خوانا)" },
  { key: "serial", label: "سریال" },
  { key: "supplier", label: "نام تامین‌کننده" },
  { key: "customer", label: "نام مشتری" },
  { key: "document", label: "شماره‌ی فاکتور" },
  { key: "receivedAt", label: "تاریخ ورود" },
]);

export const DEFAULT_LABEL_TEMPLATE = Object.freeze({
  sizeKey: "sheet-62x33",
  custom: { layout: LABEL_LAYOUTS.ROLL, widthMm: 50, heightMm: 30 },
  // فقط برای چیدمانِ رول؛ labelsPerRow=۱ یعنی تک‌برچسب و فاصله/رسانه بی‌اثرند.
  labelsPerRow: 1,
  horizontalGapMm: 2,
  mediaWidthMm: null,
  codeType: LABEL_CODE_TYPES.BARCODE,
  codeScale: LABEL_SCALES.MEDIUM,
  fontScale: LABEL_SCALES.MEDIUM,
  // null = از `fontScale` بیا (رفتارِ قبلی)؛ عدد = اندازه‌ی دقیق به pt.
  fontSizePt: null,
  fields: {
    productName: true,
    codeText: true,
    serial: false,
    supplier: false,
    customer: false,
    document: false,
    receivedAt: false,
  },
});
