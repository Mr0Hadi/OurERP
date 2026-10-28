/* global __INSPECTOR_CONFIG__ */
/**
 * کلاینتِ dev-inspector — فقط در `vite dev` از `index.js` تزریق می‌شود.
 *
 *  Alt (نگه‌داشته)       قاب و برچسب: لایه‌ی «ساخت» (درونی‌ترین کدِ برنامه، نه ui/ و shared/) و اگر فرق
 *                       دارد، لایه‌ی «این صفحه»
 *  Alt + کلیک           لایه‌ی «ساخت» را در ویرایشگر باز می‌کند (کلیک به صفحه نمی‌رسد)
 *  Alt + Shift + کلیک   لایه‌ی «این صفحه» را باز می‌کند
 *  Alt + کلیکِ راست     پنل: همه‌ی لایه‌ها، محلِ تعریف، جاهای استفاده، سندها، کپی
 *  Alt + Shift + I      حالتِ ماندگار بدونِ نگه‌داشتنِ Alt (کلیک = باز، کلیکِ راست = پنل)
 *  در پنل: ↑↓ انتخاب، Enter باز، C کپیِ مسیر، X کپی برای Claude Code، Esc بستن
 *
 * بی React و داخلِ Shadow DOM تا با استایل و رندرِ برنامه درگیر نشود. رویدادهای pointer/focus
 * درونِ پنل بالا نمی‌روند، وگرنه دیالوگ‌های Radix آن را «کلیکِ بیرون» می‌گرفتند و بسته می‌شدند.
 * کلیدها با `event.code` خوانده می‌شوند تا با چیدمانِ فارسیِ صفحه‌کلید هم کار کنند.
 */
const { root, base, ignoreLayers } = __INSPECTOR_CONFIG__;

// ─── داده: لایه‌های React برای یک المان ───────────────────────────────────────

const fiberOf = (element) => {
  for (const key in element) if (key.startsWith("__reactFiber$")) return element[key];
  return null;
};

const relPath = (file) => (file.startsWith(`${root}/`) ? file.slice(root.length + 1) : file);

const kindOf = (file) => {
  const rel = relPath(file);
  if (ignoreLayers.some((part) => file.includes(part))) return "ui";
  if (rel.endsWith("routes.jsx") || rel.startsWith("src/app/routes/")) return "route";
  if (rel.startsWith("src/shared/")) return "shared";
  if (rel.startsWith("src/app/")) return "app";
  if (rel.includes("/pages/")) return "page";
  return "feature";
};

const nameOf = (fiber) =>
  typeof fiber.type === "string"
    ? fiber.type
    : (fiber.type?.displayName ?? fiber.type?.name ?? fiber.type?.render?.name ?? "Anonymous");

/**
 * زنجیره از المان تا ریشه. هر لایه: کجا نوشته شده (`file:line`) و — برای کامپوننت‌ها — فایلِ
 * تعریفش، که همان فایلِ لایه‌ی قبلی است (المانی که این کامپوننت رندر کرده در فایلِ خودش است).
 */
function layersOf(element) {
  const layers = [];
  // DOMی که React نساخته (کاشیِ نقشه‌ی Leaflet، درونِ کتابخانه‌ها) fiber ندارد: نزدیک‌ترین نیای React.
  let owner = element;
  while (owner && !fiberOf(owner)) owner = owner.parentElement;
  for (let fiber = owner && fiberOf(owner); fiber; fiber = fiber._debugOwner) {
    const source = fiber._debugSource ?? fiber._debugInfo;
    if (!source?.fileName) continue;
    layers.push({
      name: nameOf(fiber),
      host: typeof fiber.type === "string",
      file: source.fileName,
      line: source.lineNumber ?? 1,
      rawLine: source.lineNumber ?? 1,
      kind: kindOf(source.fileName),
    });
  }
  layers.forEach((layer, index) => {
    layer.definedIn = !layer.host && index > 0 ? layers[index - 1].file : null;
  });
  return layers;
}

/**
 * خطِ دقیقِ تگِ هر لایه از سرور (`/__inspector/locate`): خطی که React می‌دهد بعد از Compiler گاهی
 * چند خط پایین‌ترِ همان تگ است. نتیجه برای هر `فایل:خط:نام` کش می‌شود.
 */
const exactLines = new Map();
const layerKey = (layer) => `${layer.file}:${layer.rawLine}:${layer.name}`;
async function refine(layers) {
  const pending = layers.filter((layer) => !exactLines.has(layerKey(layer)));
  if (pending.length > 0) {
    const query = pending.map(({ file, rawLine, name }) => ({ file, line: rawLine, name }));
    try {
      const response = await fetch(`${base}__inspector/locate?q=${encodeURIComponent(JSON.stringify(query))}`);
      const lines = await response.json();
      pending.forEach((layer, index) => exactLines.set(layerKey(layer), lines[index]));
    } catch {
      // بی سرور همان خطِ React می‌ماند.
    }
  }
  for (const layer of layers) layer.line = exactLines.get(layerKey(layer)) ?? layer.rawLine;
  return layers;
}

/**
 * پوشه‌ی کدِ صفحه‌ی فعلی: از اولین لایه‌ی `route` (عنصرِ صفحه در `routes.jsx`/روتر) فایلِ تعریفِ
 * صفحه را می‌گیریم؛ `src/features/<x>/` یا `src/app/`.
 */
function pageScope(layers) {
  const route = layers.find((layer) => layer.kind === "route" && layer.definedIn);
  if (!route) return null;
  const rel = relPath(route.definedIn);
  const feature = rel.match(/^src\/features\/[^/]+\//);
  return feature ? feature[0] : rel.startsWith("src/app/") ? "src/app/" : null;
}

/**
 * دو هدف، چون هر دو پرسشِ رایج‌اند:
 *  - **ساخت** (`primaryIndex`، Alt+کلیک): درونی‌ترین لایه‌ی کدِ برنامه — جایی که این المان ساخته
 *    می‌شود. `ui/` (shadcn) و `shared/` مثلِ کتابخانه رد می‌شوند: برای «نوع حساب»
 *    `PartyFinanceForm.jsx`، برای دکمه‌ی تاریخچه `AuditHistoryButton.jsx`.
 *  - **این صفحه** (`pageIndex`، Alt+Shift+کلیک): اولین لایه در پوشه‌ی فیچرِ صفحه‌ی فعلی — جایی که
 *    همین صفحه آن را گذاشته (`CustomerDetailPage.jsx`، `SaleDetailPage.jsx`).
 */
const APP_KINDS = ["feature", "page", "app", "route"];
const primaryIndex = (layers) => {
  const app = layers.findIndex((layer) => APP_KINDS.includes(layer.kind));
  if (app !== -1) return app;
  const nonUi = layers.findIndex((layer) => layer.kind !== "ui");
  return nonUi === -1 ? 0 : nonUi;
};
const pageIndex = (layers) => {
  const scope = pageScope(layers);
  const index = scope ? layers.findIndex((layer) => relPath(layer.file).startsWith(scope) && layer.kind !== "route") : -1;
  return index === -1 ? primaryIndex(layers) : index;
};

const location = (layer) => `${relPath(layer.file)}:${layer.line}`;

// ─── کارها: باز کردن، کپی ─────────────────────────────────────────────────────

function openInEditor(file, line = 1, column = 1) {
  fetch(`${base}__open-in-editor?file=${encodeURIComponent(`${file}:${line}:${column}`)}`);
  toast(`باز شد: ${relPath(file)}:${line}`);
}

async function copy(text, message) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // صفحه‌ی بی‌فوکوس اجازه‌ی clipboard ندارد؛ راهِ قدیمی.
    const area = document.createElement("textarea");
    area.value = text;
    document.documentElement.appendChild(area);
    area.select();
    document.execCommand("copy");
    area.remove();
  }
  toast(message);
}

const elementText = (element) => (element.innerText || element.getAttribute("aria-label") || "").trim().replace(/\s+/g, " ").slice(0, 80);

/** متنِ آماده برای Claude Code: صفحه، المان و زنجیره‌ی کامپوننت با مسیرها. */
function contextText(element, layers) {
  const text = elementText(element);
  const lines = [
    `صفحه: ${window.location.pathname}${window.location.search}`,
    `المان: <${element.tagName.toLowerCase()}>${text ? ` «${text}»` : ""}`,
    "زنجیره‌ی کامپوننت (از المان تا صفحه):",
    ...layers.map(
      (layer) =>
        `- <${layer.name}> در ${location(layer)}${layer.definedIn ? ` (تعریف: ${relPath(layer.definedIn)})` : ""}`,
    ),
  ];
  return lines.join("\n");
}

// ─── رابط: Shadow DOM ─────────────────────────────────────────────────────────

const host = document.createElement("dev-inspector");
host.style.cssText = "all:initial;position:fixed;inset:0;z-index:2147483647;pointer-events:none";
const shadow = host.attachShadow({ mode: "open" });
shadow.innerHTML = `
<style>
  :host { --bg:#16181d; --line:#2c313a; --fg:#e6e8eb; --muted:#9aa3ad; --accent:#7c9cff; }
  @media print { :host { display:none !important; } }
  * { box-sizing:border-box; font-family:"Vazirmatn Variable",system-ui,sans-serif; }
  .mono { font-family:ui-monospace,SFMono-Regular,Menlo,monospace; direction:ltr; unicode-bidi:isolate; }
  #box { position:fixed; display:none; border:2px solid var(--accent); background:rgb(124 156 255 / .12); border-radius:3px; }
  #tag { position:fixed; display:none; direction:ltr; max-width:calc(100vw - 16px); padding:3px 8px; border-radius:6px;
    background:var(--bg); color:var(--fg); font-size:12px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
    box-shadow:0 4px 14px rgb(0 0 0 / .35); }
  #tag b { color:var(--accent); font-weight:600; }
  #tag i { font-style:normal; color:var(--muted); margin-inline-start:6px; }
  #badge { position:fixed; bottom:12px; left:12px; display:none; padding:6px 10px; border-radius:999px;
    background:var(--accent); color:#0b1020; font-size:12px; font-weight:600; }
  #toast { position:fixed; bottom:12px; left:50%; transform:translateX(-50%); display:none; padding:6px 12px;
    border-radius:8px; background:var(--bg); color:var(--fg); font-size:12px; box-shadow:0 4px 14px rgb(0 0 0 / .4); }
  #panel { position:fixed; display:none; pointer-events:auto; width:min(620px, calc(100vw - 16px)); max-height:min(76vh, 640px);
    overflow:auto; border:1px solid var(--line); border-radius:10px; background:var(--bg); color:var(--fg); font-size:13px;
    box-shadow:0 12px 40px rgb(0 0 0 / .5); direction:rtl; }
  header { display:flex; align-items:center; gap:8px; padding:8px 12px; border-bottom:1px solid var(--line);
    position:sticky; top:0; background:var(--bg); }
  header .route { color:var(--muted); font-size:12px; margin-inline-start:auto; }
  button { all:unset; cursor:pointer; padding:3px 8px; border-radius:6px; border:1px solid var(--line); font-size:12px; color:var(--fg); }
  button:hover { border-color:var(--accent); }
  .layers { padding:4px; }
  .layer { display:grid; grid-template-columns:auto auto 1fr; gap:8px; align-items:center; padding:5px 8px; border-radius:6px; cursor:pointer; }
  .layer:hover { background:#20242c; }
  .layer.sel { background:#263152; }
  .layer .name { font-weight:600; }
  .layer .where { color:var(--muted); font-size:12px; text-align:left; overflow-wrap:anywhere; }
  .kind { font-size:10px; padding:1px 6px; border-radius:999px; border:1px solid var(--line); color:var(--muted); }
  .kind.ui { color:#8b95a1; } .kind.shared { color:#6fd3c6; border-color:#24524c; }
  .kind.feature { color:#f0c674; border-color:#5a4a26; } .kind.page { color:#f29e74; border-color:#5c3a26; }
  .kind.route, .kind.app { color:#b4a1ff; border-color:#40366a; }
  section { border-top:1px solid var(--line); padding:8px 12px; }
  section h4 { margin:0 0 6px; font-size:12px; color:var(--muted); font-weight:600; }
  .actions { display:flex; flex-wrap:wrap; gap:6px; }
  .item { display:block; padding:3px 6px; border-radius:5px; cursor:pointer; font-size:12px; overflow-wrap:anywhere; }
  .item:hover { background:#20242c; }
  .item small { display:block; color:var(--muted); }
  .hint { color:var(--muted); font-size:11px; padding:6px 12px 8px; }
  .empty { color:var(--muted); font-size:12px; }
</style>
<div id="box"></div><div id="tag"></div><div id="badge">Inspector — کلیک: باز کردن · کلیکِ راست: پنل · Esc: خروج</div>
<div id="panel"></div><div id="toast"></div>`;
const $ = (id) => shadow.getElementById(id);
document.documentElement.appendChild(host);

// پنل مالِ ما است: نه دیالوگِ Radix آن را «بیرون» بفهمد، نه فوکوس را از دیالوگ بدزدد.
for (const type of ["pointerdown", "mousedown", "focusin", "click", "contextmenu"]) {
  $("panel").addEventListener(type, (event) => event.stopPropagation());
}
$("panel").addEventListener("mousedown", (event) => event.preventDefault());

let toastTimer;
function toast(message) {
  const element = $("toast");
  element.textContent = message;
  element.style.display = "block";
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (element.style.display = "none"), 1600);
}

const escapeHtml = (value) =>
  String(value).replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]);

// ─── حالت: هایلایت ────────────────────────────────────────────────────────────

let sticky = false;
let altDown = false;
let pointer = { x: -1, y: -1 };
let hovered = null;
let panel = null; // { element, layers, selected, info: Map<file, data> }

const armed = () => sticky || altDown;
const isOurs = (event) => event.composedPath().includes(host);

function targetAt(x, y) {
  host.style.display = "none";
  const element = document.elementFromPoint(x, y);
  host.style.display = "";
  return element instanceof Element ? element : null;
}

function highlight(element) {
  hovered = element;
  const box = $("box");
  const tag = $("tag");
  const layers = element ? layersOf(element) : [];
  if (!element || layers.length === 0) {
    box.style.display = tag.style.display = "none";
    return;
  }
  const rect = element.getBoundingClientRect();
  Object.assign(box.style, {
    display: "block",
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
  });
  const layer = layers[primaryIndex(layers)];
  const page = layers[pageIndex(layers)];
  const label = () =>
    (tag.innerHTML =
      `<b>&lt;${escapeHtml(layer.name)}&gt;</b> <span class="mono">${escapeHtml(location(layer))}</span>` +
      (page === layer
        ? ""
        : ` <i>⇧ صفحه:</i> <b>&lt;${escapeHtml(page.name)}&gt;</b> <span class="mono">${escapeHtml(location(page))}</span>`));
  label();
  refine(layers).then(() => hovered === element && label());
  tag.style.display = "block";
  const top = rect.top > 30 ? rect.top - 28 : rect.bottom + 6;
  tag.style.top = `${Math.min(top, window.innerHeight - 28)}px`;
  tag.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - tag.offsetWidth - 8))}px`;
}

function clearHighlight() {
  hovered = null;
  $("box").style.display = $("tag").style.display = "none";
}

function setSticky(next) {
  sticky = next;
  $("badge").style.display = sticky ? "block" : "none";
  if (!sticky && !altDown) clearHighlight();
}

// ─── پنل ──────────────────────────────────────────────────────────────────────

async function loadInfo(file, name) {
  if (panel.info.has(file)) return panel.info.get(file);
  panel.info.set(file, null);
  try {
    const query = `file=${encodeURIComponent(file)}${name ? `&name=${encodeURIComponent(name)}` : ""}`;
    const response = await fetch(`${base}__inspector/info?${query}`);
    panel.info.set(file, await response.json());
  } catch {
    panel.info.set(file, { usages: [], docs: [], failed: true });
  }
  if (panel) renderPanel();
  return panel?.info.get(file);
}

function renderPanel() {
  const { element, layers, selected } = panel;
  const layer = layers[selected];
  const infoFile = layer.definedIn ?? layer.file;
  const info = panel.info.get(infoFile);
  if (!panel.info.has(infoFile)) loadInfo(infoFile, layer.definedIn ? layer.name : undefined);

  const rows = layers
    .map(
      (item, index) => `
      <div class="layer ${index === selected ? "sel" : ""}" data-index="${index}">
        <span class="kind ${item.kind}">${item.kind}${index === panel.page ? " · صفحه" : ""}</span>
        <span class="name mono">&lt;${escapeHtml(item.name)}&gt;</span>
        <span class="where mono">${escapeHtml(location(item))}</span>
      </div>`,
    )
    .join("");

  const definition = layer.definedIn
    ? `<a class="item mono" data-open="${escapeHtml(layer.definedIn)}" data-line="${info?.definitionLine ?? 1}">تعریف: ${escapeHtml(relPath(layer.definedIn))}${info?.definitionLine > 1 ? `:${info.definitionLine}` : ""}</a>`
    : "";

  const usages = !info
    ? `<div class="empty">در حالِ جست‌وجو…</div>`
    : info.usages.length === 0
      ? `<div class="empty">${layer.definedIn ? "فایلی آن را import نکرده (یا فقط از بیرونِ src)." : "—"}</div>`
      : info.usages
          .map((usage) => {
            const line = usage.renderLines[0] ?? usage.importLine;
            const extra = usage.renderLines.length > 1 ? ` (+${usage.renderLines.length - 1})` : "";
            return `<a class="item mono" data-open="${escapeHtml(usage.file)}" data-line="${line}">${escapeHtml(usage.rel)}:${line}${extra}</a>`;
          })
          .join("");

  const docs = !info
    ? ""
    : info.docs.length === 0
      ? `<div class="empty">در docs/architecture و CLAUDE.md نامی از آن نیست.</div>`
      : info.docs
          .map(
            (doc) =>
              `<a class="item" data-open="${escapeHtml(doc.file)}" data-line="${doc.line}">
                 <span class="mono">${escapeHtml(doc.rel)}:${doc.line}</span>${doc.heading ? ` — ${escapeHtml(doc.heading)}` : ""}
                 <small>${escapeHtml(doc.text)}</small></a>`,
          )
          .join("");

  const subject = layer.definedIn
    ? `<span class="mono">&lt;${escapeHtml(layer.name)}&gt;</span>`
    : `فایلِ <span class="mono">${escapeHtml(relPath(layer.file))}</span>`;
  $("panel").innerHTML = `
    <header>
      <span class="mono">&lt;${escapeHtml(element.tagName.toLowerCase())}&gt;</span>
      <span class="route mono">${escapeHtml(window.location.pathname)}</span>
      <button data-action="close" title="Esc">✕</button>
    </header>
    <div class="layers">${rows}</div>
    <section>
      <div class="actions">
        <button data-action="open">باز کردن <span class="mono">${escapeHtml(location(layer))}</span></button>
        <button data-action="copy-path" title="C">کپیِ مسیر</button>
        <button data-action="copy-context" title="X">کپی برای Claude Code</button>
      </div>
      ${definition}
    </section>
    <section><h4>جاهای استفاده‌ی ${subject} ${info ? `(${info.usages.length})` : ""}</h4>${usages}</section>
    <section><h4>در مستندها ${info ? `(${info.docs.length})` : ""}</h4>${docs}</section>
    <div class="hint">↑↓ لایه · Enter باز کردن · C کپیِ مسیر · X کپی برای Claude Code · Esc بستن</div>`;
}

function placePanel(x, y) {
  const element = $("panel");
  element.style.display = "block";
  const { width, height } = element.getBoundingClientRect();
  element.style.left = `${Math.max(8, Math.min(x - width / 2, window.innerWidth - width - 8))}px`;
  element.style.top = `${Math.max(8, y + height + 16 < window.innerHeight ? y + 16 : y - height - 16)}px`;
}

function openPanel(element, x, y) {
  const layers = layersOf(element);
  if (layers.length === 0) {
    toast("منبعی برای این المان پیدا نشد (بیرون از React؟)");
    return;
  }
  panel = { element, layers, selected: primaryIndex(layers), page: pageIndex(layers), info: new Map() };
  renderPanel();
  placePanel(x, y);
  clearHighlight();
  refine(layers).then(() => panel?.layers === layers && renderPanel());
}

function closePanel() {
  panel = null;
  $("panel").style.display = "none";
}

function act(action) {
  if (!panel) return;
  const layer = panel.layers[panel.selected];
  if (action === "open") openInEditor(layer.file, layer.line);
  if (action === "copy-path") copy(location(layer), `کپی شد: ${location(layer)}`);
  if (action === "copy-context") copy(contextText(panel.element, panel.layers), "زمینه برای Claude Code کپی شد");
  if (action === "close") closePanel();
}

$("panel").addEventListener("click", (event) => {
  const target = event.target.closest("[data-action],[data-index],[data-open]");
  if (!target) return;
  if (target.dataset.action) act(target.dataset.action);
  else if (target.dataset.index) {
    panel.selected = Number(target.dataset.index);
    renderPanel();
  } else openInEditor(target.dataset.open, Number(target.dataset.line) || 1);
});
$("panel").addEventListener("dblclick", (event) => {
  if (event.target.closest("[data-index]")) act("open");
});

// ─── رویدادهای صفحه (capture: پیش از React) ──────────────────────────────────

window.addEventListener(
  "keydown",
  (event) => {
    if (event.altKey && event.shiftKey && event.code === "KeyI") {
      event.preventDefault();
      setSticky(!sticky);
      return;
    }
    if (event.key === "Alt") {
      altDown = true;
      if (!panel) highlight(targetAt(pointer.x, pointer.y));
      return;
    }
    if (panel) {
      const keys = { ArrowDown: 1, ArrowUp: -1 };
      if (event.code in keys) {
        panel.selected = Math.max(0, Math.min(panel.layers.length - 1, panel.selected + keys[event.code]));
        renderPanel();
      } else if (event.key === "Enter") act("open");
      else if (event.code === "KeyC" && !event.ctrlKey && !event.metaKey) act("copy-path");
      else if (event.code === "KeyX" && !event.ctrlKey && !event.metaKey) act("copy-context");
      else if (event.key === "Escape") closePanel();
      else return;
      // دیالوگِ زیرِ پنل Esc و Enter را نگیرد.
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    if (sticky && event.key === "Escape") {
      event.stopImmediatePropagation();
      setSticky(false);
    }
  },
  true,
);

window.addEventListener(
  "keyup",
  (event) => {
    if (event.key !== "Alt") return;
    altDown = false;
    // فایرفاکس با رها کردنِ Alt نوارِ منو را باز می‌کند.
    if (hovered) event.preventDefault();
    if (!sticky) clearHighlight();
  },
  true,
);

window.addEventListener("blur", () => {
  altDown = false;
  if (!sticky) clearHighlight();
});

window.addEventListener(
  "pointermove",
  (event) => {
    pointer = { x: event.clientX, y: event.clientY };
    altDown = event.altKey;
    if (!armed() || panel || isOurs(event)) return;
    const element = targetAt(event.clientX, event.clientY);
    if (element !== hovered) highlight(element);
  },
  true,
);

/** کلیکِ بازرسی به صفحه نمی‌رسد: نه دکمه‌ای اجرا شود، نه لینکی دانلود (Alt+کلیکِ کروم). */
const swallow = (event) => {
  // `event.altKey` هم: کلیک می‌تواند بی keydownِ جدا یا حرکتِ ماوسِ قبلی برسد.
  if (!(armed() || event.altKey) || isOurs(event) || event.button === 2) return false;
  event.preventDefault();
  event.stopImmediatePropagation();
  return true;
};
for (const type of ["pointerdown", "mousedown", "pointerup", "mouseup"]) {
  window.addEventListener(type, swallow, true);
}

window.addEventListener(
  "click",
  (event) => {
    if (panel && !isOurs(event)) closePanel();
    if (!swallow(event)) return;
    const element = targetAt(event.clientX, event.clientY);
    const layers = element ? layersOf(element) : [];
    if (layers.length === 0) return;
    const layer = layers[event.shiftKey ? pageIndex(layers) : primaryIndex(layers)];
    refine([layer]).then(() => openInEditor(layer.file, layer.line));
  },
  true,
);

window.addEventListener(
  "contextmenu",
  (event) => {
    if (!(event.altKey || sticky) || isOurs(event)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const element = targetAt(event.clientX, event.clientY);
    if (element) openPanel(element, event.clientX, event.clientY);
  },
  true,
);

window.addEventListener("scroll", () => hovered && highlight(hovered), true);
