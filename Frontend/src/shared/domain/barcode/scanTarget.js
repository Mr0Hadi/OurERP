/**
 * منطقِ «کادرِ هدفِ اسکن» — خالص و بدون DOM تا قابل‌آزمون باشد.
 *
 * سه دستگاه مختصات در کار است و عمداً یکی نشده‌اند:
 *   ۱. فریمِ دوربین (پیکسلِ ویدئو) — مختصاتی که detector می‌دهد.
 *   ۲. نمایش (پیکسلِ المانِ <video>) — با object-fit: cover بریده/بزرگ می‌شود.
 *   ۳. کادرِ هدف — کسری از نمایش (کاربر همین را می‌بیند).
 * کادر را از (۳) به (۱) می‌بریم و کدها را در همان فریم می‌سنجیم.
 */

/** کادرِ هدف به‌صورت کسری از نمایش، وسطِ پیش‌نمایش. */
export const SCAN_TARGET = Object.freeze({ width: 0.7, height: 0.5 });

/** حداقل سهمِ مساحتِ کد که باید داخلِ کادر باشد. */
export const MIN_INSIDE_RATIO = 0.85;

/** کادرِ هدف (کسری از نمایش) → مستطیل در پیکسلِ فریمِ ویدئو، با object-fit: cover. */
export function targetInVideoSpace(display, video, target = SCAN_TARGET) {
  const scale = Math.max(display.width / video.width, display.height / video.height);
  const offsetX = (video.width * scale - display.width) / 2;
  const offsetY = (video.height * scale - display.height) / 2;
  const w = display.width * target.width;
  const h = display.height * target.height;
  const x = (display.width - w) / 2;
  const y = (display.height - h) / 2;
  return {
    x: (x + offsetX) / scale,
    y: (y + offsetY) / scale,
    width: w / scale,
    height: h / scale,
  };
}

/** مستطیلِ دربرگیرنده‌ی یک کدِ شناسایی‌شده در پیکسلِ فریم؛ بدونِ هندسه null. */
export function boxOfHit(hit) {
  if (hit?.boundingBox) {
    const { x, y, width, height } = hit.boundingBox;
    return { x, y, width, height };
  }
  if (hit?.cornerPoints?.length) {
    const xs = hit.cornerPoints.map((p) => p.x);
    const ys = hit.cornerPoints.map((p) => p.y);
    const x = Math.min(...xs);
    const y = Math.min(...ys);
    return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
  }
  return null;
}

function insideRatio(box, target) {
  const area = box.width * box.height;
  if (area <= 0) return 0;
  const w = Math.min(box.x + box.width, target.x + target.width) - Math.max(box.x, target.x);
  const h = Math.min(box.y + box.height, target.y + target.height) - Math.max(box.y, target.y);
  return w > 0 && h > 0 ? (w * h) / area : 0;
}

/**
 * از میانِ کدهای یک فریم، فقط آن‌هایی که داخلِ کادرند را می‌پذیرد.
 *
 * - هیچ‌کدام داخل نبود → `none` (کدِ بیرونِ کادر و کدِ بی‌هندسه نادیده می‌شوند).
 * - یک مقدارِ متمایز → `single` (بارکد و QRِ یک برچسب یک رشته را حمل می‌کنند،
 *   پس دو نمادِ هم‌مقدار ابهام نیست).
 * - چند مقدارِ متفاوت → `ambiguous`؛ یکی را حدسی انتخاب نمی‌کنیم.
 */
export function pickTargetHit(hits, targetRect, minInside = MIN_INSIDE_RATIO) {
  const inside = (hits ?? []).filter((hit) => {
    if (!hit?.rawValue) return false;
    const box = boxOfHit(hit);
    return box && insideRatio(box, targetRect) >= minInside;
  });
  if (inside.length === 0) return { status: "none", hit: null };
  const values = new Set(inside.map((hit) => hit.rawValue));
  if (values.size > 1) return { status: "ambiguous", hit: null };
  return { status: "single", hit: inside[0] };
}
