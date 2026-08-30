// src/shared/components/charts/chartUtils.js

/**
 * ریاضیاتِ مشترکِ نمودارها.
 *
 * نمودارها اینجا دستی با SVG کشیده می‌شوند، نه با یک کتابخانه‌ی چارت.
 * دلیلش سه چیز است: (۱) رنگ‌ها باید از همان توکن‌های تم بیایند تا هر
 * چهار پوسته‌ی برنامه درست دربیایند، (۲) اعداد و تاریخ‌ها باید فارسی و
 * راست‌به‌چپ باشند، و (۳) بسته‌ی چارت برای این تعداد نمودار وزنِ اضافه
 * است. چیزی که یک کتابخانه می‌داد و اینجا نیست، همین چند تابع است — پس
 * همه‌شان یک‌جا جمع شده‌اند تا در هر نمودار تکرار نشوند.
 */

// ─── مقیاس و تیک ────────────────────────────────────────────────────────────

/**
 * مرزهای «گرد» برای محور مقدار.
 *
 * اگر مستقیم از min/max داده استفاده کنیم، برچسب‌های محور اعدادی مثل
 * ۶۳۷٬۴۱۲٬۹۰۳ می‌شوند که هیچ‌کس نمی‌خواندشان. این تابع بازه را به ضریبی
 * از یک گامِ خوش‌ظاهر (۱، ۲، ۵ × توانِ ده) گرد می‌کند.
 *
 * صفر همیشه داخل بازه می‌ماند، وگرنه ستون‌های سودِ منفی از کفِ نمودار
 * آویزان می‌شوند و خواننده علامتشان را نمی‌بیند.
 */
export function niceScale(values, tickCount = 4) {
  const finite = values.filter((v) => Number.isFinite(v));
  let min = Math.min(0, ...finite);
  let max = Math.max(0, ...finite);

  if (min === max) {
    // همه‌ی مقادیر صفرند — یک بازه‌ی ساختگی تا نمودار خالی نشود.
    return { min: 0, max: 1, ticks: [0, 1] };
  }

  const rawStep = (max - min) / tickCount;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const normalized = rawStep / magnitude;
  const step =
    (normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10) *
    magnitude;

  min = Math.floor(min / step) * step;
  max = Math.ceil(max / step) * step;

  const ticks = [];
  for (let v = min; v <= max + step / 2; v += step) {
    // جمعِ ممیزِ شناور خطای ریز می‌سازد؛ گرد کردن به گام، تیکِ «۰» را
    // واقعاً صفر نگه می‌دارد.
    ticks.push(Math.round(v / step) * step);
  }

  return { min, max, ticks };
}

/** نگاشتِ یک مقدار به مختصاتِ y داخل ناحیه‌ی رسم. */
export function makeValueScale({ min, max, top, bottom }) {
  const span = max - min || 1;
  return (value) => bottom - ((value - min) / span) * (bottom - top);
}

/**
 * مرکز و شروعِ باندِ i اُم. نمودارهای خطی و ستونی هر دو از همین استفاده
 * می‌کنند تا وقتی کنار هم می‌نشینند نقطه‌هایشان دقیقاً هم‌راستا باشد.
 */
export function makeBandScale({ count, left, right }) {
  const band = (right - left) / (count || 1);
  return {
    band,
    center: (index) => left + band * index + band / 2,
    start: (index) => left + band * index,
  };
}

/** نزدیک‌ترین اندیس به مختصاتِ x — مبنای هاور و کراس‌هیر. */
export function indexAtPosition(x, { count, left, right }) {
  if (!count) return -1;
  const band = (right - left) / count;
  const index = Math.floor((x - left) / band);
  return Math.min(count - 1, Math.max(0, index));
}

/**
 * کدام بازه‌ها روی محورِ زمان برچسب بگیرند.
 *
 * در نمای روزانه ۳۶۵ نقطه داریم؛ برچسب‌زدنِ همه یعنی یک نوارِ سیاه.
 * آخرین بازه همیشه برچسب می‌گیرد (کاربر دنبالِ همان است)، ولی اگر به
 * برچسبِ قبلی‌اش بچسبد آن یکی حذف می‌شود — وگرنه روی موبایل دو تاریخ
 * روی هم چاپ می‌شوند.
 */
export function axisLabelIndices(count, width) {
  if (count === 0) return [];

  const step = Math.ceil(count / Math.max(2, Math.floor(width / 90)));
  const indices = [];
  for (let i = 0; i < count; i += step) indices.push(i);

  const last = count - 1;
  if (indices[indices.length - 1] !== last) {
    if (last - indices[indices.length - 1] < step / 2) indices.pop();
    indices.push(last);
  }
  return indices;
}

// ─── مسیرها ─────────────────────────────────────────────────────────────────

/**
 * خطِ نرم با درون‌یابیِ مکعبیِ یکنوا.
 *
 * منحنیِ Bézier با نقاطِ کنترلِ ثابت روی داده‌های پرنوسان «تاب برمی‌دارد»
 * و مقادیری بیرون از بازه‌ی واقعی نشان می‌دهد — یعنی نمودار سودی را
 * نشان می‌دهد که هیچ‌وقت وجود نداشته. مماسِ یکنوا تضمین می‌کند منحنی
 * هرگز از مقادیرِ همسایه فراتر نرود.
 */
export function monotonePath(points) {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  const n = points.length;
  const dx = [];
  const dy = [];
  const slope = [];

  for (let i = 0; i < n - 1; i++) {
    dx[i] = points[i + 1].x - points[i].x;
    dy[i] = points[i + 1].y - points[i].y;
    slope[i] = dy[i] / (dx[i] || 1);
  }

  const tangent = [slope[0]];
  for (let i = 1; i < n - 1; i++) {
    if (slope[i - 1] * slope[i] <= 0) {
      tangent[i] = 0; // نقطه‌ی اکسترمم — مماسِ افقی، تا منحنی سرریز نکند
    } else {
      tangent[i] = (slope[i - 1] + slope[i]) / 2;
      const limit = 3 * Math.min(Math.abs(slope[i - 1]), Math.abs(slope[i]));
      if (Math.abs(tangent[i]) > limit) {
        tangent[i] = Math.sign(tangent[i]) * limit;
      }
    }
  }
  tangent[n - 1] = slope[n - 2];

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < n - 1; i++) {
    const third = dx[i] / 3;
    d +=
      ` C ${points[i].x + third} ${points[i].y + tangent[i] * third}` +
      ` ${points[i + 1].x - third} ${points[i + 1].y - tangent[i + 1] * third}` +
      ` ${points[i + 1].x} ${points[i + 1].y}`;
  }
  return d;
}

/** همان خط، بسته‌شده تا خطِ پایه — برای پرکردنِ زیرِ نمودار. */
export function areaPath(points, baselineY) {
  if (points.length === 0) return "";
  const line = monotonePath(points);
  const last = points[points.length - 1];
  const first = points[0];
  return `${line} L ${last.x} ${baselineY} L ${first.x} ${baselineY} Z`;
}

/** مستطیلِ گردگوشه‌ی ستون — فقط دو گوشه‌ی سمتِ مقدار گرد می‌شوند. */
export function barPath({ x, y, width, height, radius = 4 }) {
  const r = Math.max(0, Math.min(radius, width / 2, Math.abs(height)));
  if (height >= 0) {
    // ستونِ رو به بالا: y نوکِ ستون است و height به سمتِ خطِ پایه
    return (
      `M ${x} ${y + height} L ${x} ${y + r} Q ${x} ${y} ${x + r} ${y}` +
      ` L ${x + width - r} ${y} Q ${x + width} ${y} ${x + width} ${y + r}` +
      ` L ${x + width} ${y + height} Z`
    );
  }
  const bottom = y + Math.abs(height);
  return (
    `M ${x} ${y} L ${x} ${bottom - r} Q ${x} ${bottom} ${x + r} ${bottom}` +
    ` L ${x + width - r} ${bottom} Q ${x + width} ${bottom} ${x + width} ${bottom - r}` +
    ` L ${x + width} ${y} Z`
  );
}

// ─── قوس‌های دونات ──────────────────────────────────────────────────────────

const polar = (cx, cy, radius, angle) => ({
  x: cx + radius * Math.cos(angle),
  y: cy + radius * Math.sin(angle),
});

/** قوسِ حلقوی بین دو زاویه (رادیان، ساعت‌گرد از بالا). */
export function donutArcPath({ cx, cy, outer, inner, startAngle, endAngle }) {
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
  const p1 = polar(cx, cy, outer, startAngle);
  const p2 = polar(cx, cy, outer, endAngle);
  const p3 = polar(cx, cy, inner, endAngle);
  const p4 = polar(cx, cy, inner, startAngle);
  return (
    `M ${p1.x} ${p1.y} A ${outer} ${outer} 0 ${largeArc} 1 ${p2.x} ${p2.y}` +
    ` L ${p3.x} ${p3.y} A ${inner} ${inner} 0 ${largeArc} 0 ${p4.x} ${p4.y} Z`
  );
}

// ─── قالب‌بندیِ عدد ─────────────────────────────────────────────────────────

/** عددِ کامل با جداکننده‌ی فارسی. */
export const formatNumber = (value) =>
  Number(value ?? 0).toLocaleString("fa-IR", { maximumFractionDigits: 0 });

const UNITS = [
  { limit: 1e12, suffix: "هزار میلیارد", divisor: 1e12 },
  { limit: 1e9, suffix: "میلیارد", divisor: 1e9 },
  { limit: 1e6, suffix: "میلیون", divisor: 1e6 },
  { limit: 1e3, suffix: "هزار", divisor: 1e3 },
];

/**
 * عددِ فشرده برای برچسبِ محور و کارت‌های KPI — «۶۲۰ میلیون».
 *
 * مبالغ در این سیستم ریالی‌اند و به‌راحتی ده‌رقمی می‌شوند؛ بدون
 * فشرده‌سازی، برچسب‌های محور روی هم می‌افتند.
 */
export function formatCompact(value) {
  const n = Number(value ?? 0);
  const abs = Math.abs(n);
  const unit = UNITS.find((u) => abs >= u.limit);
  if (!unit) return formatNumber(n);

  const scaled = n / unit.divisor;
  const digits = Math.abs(scaled) < 10 ? 1 : 0;
  const text = scaled.toLocaleString("fa-IR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  });
  return `${text} ${unit.suffix}`;
}

/** درصد با حداکثر یک رقمِ اعشار — برای حاشیه‌ی سود و سهمِ دونات. */
export function formatPercent(value, { withSign = false } = {}) {
  const n = Number(value ?? 0);
  const text = Math.abs(n).toLocaleString("fa-IR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  });
  const sign = n < 0 ? "−" : withSign && n > 0 ? "+" : "";
  return `${sign}${text}٪`;
}

/**
 * رنگِ سری‌ها از توکن‌های تم می‌آید نه از مقادیرِ هاردکد — چهار پوسته‌ی
 * برنامه هرکدام `--chart-*` خودشان را دارند.
 */
export const CHART_COLORS = Object.freeze({
  1: "var(--chart-1)",
  2: "var(--chart-2)",
  3: "var(--chart-3)",
  4: "var(--chart-4)",
  5: "var(--chart-5)",
});
