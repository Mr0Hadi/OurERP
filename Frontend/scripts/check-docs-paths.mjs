/**
 * بررسی می‌کند همه‌ی مسیرهایی که در `docs/architecture/**.md` و `CLAUDE.md` آمده‌اند
 * واقعاً وجود دارند — تا سند با جابه‌جاییِ فایل‌ها بی‌صدا کهنه نشود.
 *
 * دو نوع مسیر خوانده می‌شود:
 *   - داخلِ backtick (`src/shared/lib/utils.js`) — نسبت به ریشه‌ی `Frontend/`
 *   - هدفِ لینکِ Markdown ([متن](02-folder-structure.md)) — نسبت به خودِ فایلِ سند
 *
 * فقط چیزی مسیر حساب می‌شود که `/` داشته باشد (یا لینک باشد) و با یکی از
 * ریشه‌های شناخته‌شده شروع شود؛ الگوها (`<f>`، `*`، `{a,b}`، `…`) نادیده گرفته می‌شوند.
 *
 * مسیری که عمداً وجود ندارد (فایلِ گمشده‌ای که سند گزارش می‌کند، فایلِ پیشنهادی) با
 * یک کامنت در همان سند استثنا می‌شود:  <!-- docs-paths-ignore: public/favicon.svg, src/x.js -->
 *
 * اجرا:  node scripts/check-docs-paths.mjs     (خروجِ ۱ اگر مسیری پیدا نشد)
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DOCS = join(ROOT, "docs", "architecture");

const KNOWN_ROOTS = [
  "src/",
  "scripts/",
  "public/",
  "docs/",
  "../Backend-Net/",
  "Backend-Net/",
];
const ROOT_FILES = new Set([
  "package.json",
  "vite.config.js",
  "jsconfig.json",
  "eslint.config.js",
  "knip.json",
  "components.json",
  "index.html",
  "tailwind.config.js",
  "structure.js",
  ".env.example",
  "FEATURE-GAPS.fa.md",
  "CLAUDE.md",
  "pnpm-lock.yaml",
]);
const PATTERN_CHARS = /[<>*{}…|]|\.\.\.|\s/;

function markdownFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return markdownFiles(full);
    return name.endsWith(".md") ? [full] : [];
  });
}

/** `src/a.js:42` → `src/a.js`؛ `file.md#anchor` → `file.md`. */
const clean = (raw) => raw.replace(/#.*$/, "").replace(/:\d+(-\d+)?$/, "").replace(/\/$/, "");

function backtickPaths(text) {
  const found = [];
  for (const match of text.matchAll(/`([^`\n]+)`/g)) {
    const token = match[1].trim();
    if (PATTERN_CHARS.test(token)) continue;
    const path = clean(token);
    const isPath = KNOWN_ROOTS.some((r) => path.startsWith(r)) || ROOT_FILES.has(path);
    if (isPath) found.push(path);
  }
  return found;
}

function linkTargets(text) {
  const found = [];
  for (const match of text.matchAll(/\]\(([^)\s]+)\)/g)) {
    const target = match[1];
    if (/^[a-z]+:/i.test(target) || target.startsWith("#")) continue;
    const path = clean(target);
    if (path && !PATTERN_CHARS.test(path)) found.push(path);
  }
  return found;
}

/** مسیرِ backtick نسبت به `Frontend/`؛ `Backend-Net/...` نسبت به ریشه‌ی مخزن. */
function resolveBacktick(path) {
  if (path.startsWith("Backend-Net/")) return join(ROOT, "..", path);
  return join(ROOT, path);
}

const docFiles = [...markdownFiles(DOCS), join(ROOT, "CLAUDE.md")].filter(existsSync);
const missing = [];
let checked = 0;

for (const file of docFiles) {
  const text = readFileSync(file, "utf8");
  const where = relative(ROOT, file);
  const ignored = new Set(
    [...text.matchAll(/<!--\s*docs-paths-ignore:([^>]*)-->/g)].flatMap((m) =>
      m[1].split(",").map((p) => p.trim()).filter(Boolean),
    ),
  );
  for (const path of backtickPaths(text)) {
    if (ignored.has(path)) continue;
    checked += 1;
    if (!existsSync(resolveBacktick(path))) missing.push(`${where}: \`${path}\``);
  }
  for (const path of linkTargets(text)) {
    checked += 1;
    if (!existsSync(join(dirname(file), path))) missing.push(`${where}: (${path})`);
  }
}

const unique = [...new Set(missing)];
if (unique.length) {
  console.error(`✗ ${unique.length} مسیرِ ناموجود (از ${checked} ارجاع در ${docFiles.length} فایل):`);
  for (const line of unique) console.error(`  ${line}`);
  process.exit(1);
}
console.log(`✓ همه‌ی ${checked} ارجاع در ${docFiles.length} فایل وجود دارند.`);
