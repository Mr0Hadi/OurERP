// رنگ meta theme-color را با مقدار واقعی --background تم فعلی هماهنگ می‌کند.
// oklch() باید به rgb() تبدیل شود چون در content متا پذیرفته نمی‌شود.
export function syncThemeColor() {
  const bg = getComputedStyle(document.documentElement)
    .getPropertyValue('--background')
    .trim();

  if (!bg) return;

  // یک پیکسلِ canvas هر رنگِ CSS (از جمله oklch) را به sRGB تبدیل می‌کند.
  // `getComputedStyle` در مرورگرهای جدید خودِ oklch() را برمی‌گرداند که
  // `theme-color` آن را نمی‌پذیرد.
  let resolvedColor;
  try {
    const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
    ctx.fillStyle = '#000';
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
    resolvedColor = `rgb(${r}, ${g}, ${b})`;
  } catch {
    const probe = document.createElement('div');
    probe.style.backgroundColor = bg;
    probe.style.display = 'none';
    document.body.appendChild(probe);
    resolvedColor = getComputedStyle(probe).backgroundColor;
    document.body.removeChild(probe);
  }

  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', resolvedColor);
}
