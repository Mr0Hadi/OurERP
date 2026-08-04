// رنگ meta theme-color را با مقدار واقعی --background تم فعلی هماهنگ می‌کند.
// از یک المان مخفی برای resolve کردن oklch() به rgb() استفاده می‌شود
// چون پشتیبانی مرورگرها از oklch() مستقیم در content متا هنوز کامل نیست.
export function syncThemeColor() {
  const bg = getComputedStyle(document.documentElement)
    .getPropertyValue('--background')
    .trim();

  if (!bg) return;

  const probe = document.createElement('div');
  probe.style.backgroundColor = bg;
  probe.style.display = 'none';
  document.body.appendChild(probe);
  const resolvedColor = getComputedStyle(probe).backgroundColor; // مثلا "rgb(10, 10, 10)"
  document.body.removeChild(probe);

  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', resolvedColor);
}
