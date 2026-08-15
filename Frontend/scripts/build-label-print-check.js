/**
 * می‌سازد: label-print-check.html — یک فایل مستقل برای وارسی دستیِ چاپ.
 *
 * چرا لازم است: صحت خروجی چاپ را فقط با «چاپ واقعی / Save as PDF» می‌شود
 * دید و آن کار از داخل ابزارهای خودکار قابل انجام نیست. این فایل همان
 * هندسه‌ی صفحه (sheetPresets)، همان CSS چاپ (print.css) و همان کتابخانه‌ی
 * بارکد (JsBarcode با همان تنظیمات BarcodeGraphic) را استفاده می‌کند تا
 * بدون بالا آوردن dev server قابل باز کردن و چاپ‌گرفتن باشد.
 *
 * توجه: این فایل بازتولیدِ خروجی است، نه خودِ DOM برنامه. اگر
 * sheetPresets یا BarcodeGraphic عوض شد، این اسکریپت هم باید دوباره
 * اجرا شود.
 *
 * اجرا:  node scripts/build-label-print-check.js
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

const JSBARCODE_PATH = join(
  root,
  "node_modules/.pnpm/jsbarcode@3.12.3/node_modules/jsbarcode/dist/JsBarcode.all.min.js",
);

// همان مقادیر shared/components/print/sheetPresets.js
const PRESETS = {
  "a4-3x8": {
    label: "A4 — ۲۴ برچسب (۶۲×۳۳ میلی‌متر)",
    pageSize: "A4",
    pageWidthMm: 210,
    pageHeightMm: 297,
    pageMarginMm: 8,
    columns: 3,
    rows: 8,
    labelWidthMm: 62,
    labelHeightMm: 33,
    gapMm: 2,
  },
  "a4-2x5": {
    label: "A4 — ۱۰ برچسب (۹۳×۵۳ میلی‌متر)",
    pageSize: "A4",
    pageWidthMm: 210,
    pageHeightMm: 297,
    pageMarginMm: 10,
    columns: 2,
    rows: 5,
    labelWidthMm: 93,
    labelHeightMm: 53,
    gapMm: 3,
  },
};

// همان مقادیر BARCODE_PRESETS.label در shared/services/barcode/barcodeConfig.js
const BARCODE = { width: 1.4, height: 38, fontSize: 11, margin: 2 };

const LABEL_COUNT = 30;

const units = Array.from({ length: LABEL_COUNT }, (_, i) => ({
  unitCode: `U-050524-0003-${String(i + 1).padStart(5, "0")}`,
  productName: "کمک فنر جلو",
  productCode: "SHK-305",
  refNumber: "PUR-2026-001",
  date: "۱۴۰۵/۰۵/۲۴",
}));

const jsBarcode = readFileSync(JSBARCODE_PATH, "utf8");

const html = `<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8" />
<title>وارسی چاپ برچسب واحدها</title>
<style>
  body { margin: 0; background: #f3f4f6; font-family: system-ui, sans-serif; }
  .toolbar {
    position: sticky; top: 0; z-index: 10; display: flex; gap: 12px;
    align-items: center; flex-wrap: wrap;
    padding: 12px 16px; background: #fff; border-bottom: 1px solid #d1d5db;
  }
  .toolbar button, .toolbar select { font: inherit; padding: 8px 14px; border-radius: 8px; border: 1px solid #d1d5db; background: #fff; cursor: pointer; }
  .toolbar button.primary { background: #111827; color: #fff; border-color: #111827; }
  .hint { color: #4b5563; font-size: 13px; }
  .sheet { display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 16px; }
  .print-page { background: #fff; box-shadow: 0 1px 4px rgba(0,0,0,.15); box-sizing: border-box; }
  .grid { display: grid; justify-content: center; }
  .print-label {
    display: flex; flex-direction: column; align-items: center;
    justify-content: center; overflow: hidden; box-sizing: border-box;
    padding: 0 4px; color: #000;
  }
  .print-label .name { font-size: 9px; font-weight: 500; line-height: 1.1; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .print-label svg { max-width: 100%; height: auto; }
  .print-label .meta { display: flex; width: 100%; justify-content: space-between; gap: 4px; font-size: 7px; line-height: 1.1; color: #374151; padding: 0 2px; }
  .print-label .meta span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  /* همان قواعد shared/components/print/print.css */
  @media print {
    body { background: #fff; }
    .toolbar { display: none !important; }
    .sheet { padding: 0 !important; gap: 0 !important; display: block !important; }
    .print-page { box-shadow: none !important; margin: 0 !important; break-after: page; page-break-after: always; }
    .print-page:last-child { break-after: auto; page-break-after: auto; }
    .print-label { break-inside: avoid; page-break-inside: avoid; }
  }
</style>
</head>
<body>
  <div class="toolbar">
    <strong>وارسی چاپ برچسب</strong>
    <select id="preset">
      ${Object.entries(PRESETS)
        .map(
          ([key, p], index) =>
            `<option value="${key}"${index === 0 ? " selected" : ""}>${p.label}</option>`,
        )
        .join("\n      ")}
    </select>
    <button class="primary" onclick="window.print()">چاپ / ذخیره PDF</button>
    <span class="hint" id="hint"></span>
  </div>
  <div class="sheet" id="sheet"></div>

<script>${jsBarcode}</script>
<script>
  const PRESETS = ${JSON.stringify(PRESETS)};
  const BARCODE = ${JSON.stringify(BARCODE)};
  const UNITS = ${JSON.stringify(units)};

  function pageStyle(p) {
    return "width:" + p.pageWidthMm + "mm;height:" + p.pageHeightMm + "mm;padding:" + p.pageMarginMm + "mm;";
  }
  function gridStyle(p) {
    return "grid-template-columns:repeat(" + p.columns + "," + p.labelWidthMm + "mm);"
      + "grid-auto-rows:" + p.labelHeightMm + "mm;gap:" + p.gapMm + "mm;";
  }

  function render(presetKey) {
    const p = PRESETS[presetKey];
    const perPage = p.columns * p.rows;
    const sheet = document.getElementById("sheet");
    sheet.innerHTML = "";

    const pageCount = Math.ceil(UNITS.length / perPage);
    document.getElementById("hint").textContent =
      UNITS.length + " برچسب — " + pageCount + " صفحه — هر صفحه " + perPage + " تا";

    // اندازه‌ی @page باید با اندازه‌ی بلوک صفحه یکی باشد و حاشیه‌اش صفر،
    // چون حاشیه به شکل padding داخل خودِ بلوک است.
    let rule = document.getElementById("page-rule");
    if (!rule) { rule = document.createElement("style"); rule.id = "page-rule"; document.head.appendChild(rule); }
    rule.textContent = "@page { size: " + p.pageSize + "; margin: 0; }";

    for (let i = 0; i < UNITS.length; i += perPage) {
      const page = document.createElement("div");
      page.className = "print-page";
      page.setAttribute("style", pageStyle(p));

      const grid = document.createElement("div");
      grid.className = "grid";
      grid.setAttribute("style", gridStyle(p));

      UNITS.slice(i, i + perPage).forEach((u) => {
        const cell = document.createElement("div");
        cell.className = "print-label";

        const name = document.createElement("div");
        name.className = "name";
        name.textContent = u.productName;

        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");

        const meta = document.createElement("div");
        meta.className = "meta";
        meta.innerHTML = "<span>" + u.productCode + "</span><span>" + u.refNumber + "</span><span>" + u.date + "</span>";

        cell.appendChild(name);
        cell.appendChild(svg);
        cell.appendChild(meta);
        grid.appendChild(cell);

        JsBarcode(svg, u.unitCode, {
          format: "CODE128",
          width: BARCODE.width,
          height: BARCODE.height,
          fontSize: BARCODE.fontSize,
          margin: BARCODE.margin,
          displayValue: true,
          background: "transparent",
          lineColor: "#000000",
        });
      });

      page.appendChild(grid);
      sheet.appendChild(page);
    }
  }

  const presetSelect = document.getElementById("preset");
  presetSelect.addEventListener("change", (e) => render(e.target.value));
  // بعضی مرورگرها مقدار قبلیِ فرم را برمی‌گردانند؛ صریح ست می‌کنیم تا
  // چیزی که رندر می‌شود همان چیزی باشد که در فهرست انتخاب شده.
  presetSelect.value = "a4-3x8";
  render(presetSelect.value);
</script>
</body>
</html>
`;

mkdirSync(join(root, "scripts"), { recursive: true });
const outPath = join(root, "label-print-check.html");
writeFileSync(outPath, html, "utf8");
console.log("wrote", outPath, `(${(html.length / 1024).toFixed(0)} KB)`);
