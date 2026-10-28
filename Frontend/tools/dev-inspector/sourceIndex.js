/**
 * نمایه‌ی سمتِ سرورِ dev-inspector: برای یک فایلِ کامپوننت، چه فایل‌هایی آن را import
 * می‌کنند (و در کدام خط به‌صورتِ `<Name` رندرش می‌کنند) و کدام سندها نامش را آورده‌اند.
 *
 * فقط در `vite dev` ساخته می‌شود و فقط با درخواستِ اول (تنبل)؛ تغییرِ هر فایل در `src/` یا
 * `docs/` نمایه را باطل می‌کند و درخواستِ بعدی دوباره می‌سازدش (پروژه چند صد فایل است، چند ده
 * میلی‌ثانیه). importها با regex خوانده می‌شوند نه parser: هدف «کجا استفاده شده» است، نه تحلیلِ
 * کامل؛ `import()`ِ پویا و `export … from` هم شمرده می‌شوند.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, dirname, extname, join, relative, resolve, sep } from "node:path";

const SOURCE_EXTENSIONS = [".jsx", ".js"];
const RESOLVE_SUFFIXES = ["", ".jsx", ".js", "/index.jsx", "/index.js"];
/** چند خط بالاتر از خطِ گزارش‌شده دنبالِ تگ بگردیم (بزرگ‌ترین تگِ چندخطیِ پروژه کمتر است). */
const LOCATE_WINDOW = 80;

// import/export با `from` (چندخطی هم)، و import()ِ پویا.
const STATIC_IMPORT = /(?:^|\n)\s*(?:import|export)\s+([\s\S]*?)\s+from\s+["']([^"']+)["']/g;
const DYNAMIC_IMPORT = /import\(\s*["']([^"']+)["']\s*\)/g;

function walk(dir, extensions, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, extensions, out);
    else if (extensions.includes(extname(name))) out.push(full);
  }
  return out;
}

const lineOf = (text, index) => text.slice(0, index).split("\n").length;

/** نام‌هایی که یک importِ ایستا به فایلِ مقصد می‌دهد: `X`، `{ A, B as C }` → X, A, C. */
function importedNames(clause) {
  const names = [];
  const braces = clause.match(/\{([\s\S]*)\}/);
  const head = clause.replace(/\{[\s\S]*\}/, "").replace(/\*\s+as\s+\w+/, "");
  for (const part of head.split(",")) {
    const name = part.trim();
    if (/^[A-Za-z_$][\w$]*$/.test(name) && name !== "type") names.push(name);
  }
  if (braces) {
    for (const part of braces[1].split(",")) {
      const alias = part.trim().split(/\s+as\s+/).pop()?.trim();
      if (alias && /^[A-Za-z_$][\w$]*$/.test(alias)) names.push(alias);
    }
  }
  return names;
}

export function createSourceIndex({ root, srcDir = "src", docGlobs = ["docs/architecture", "CLAUDE.md"] }) {
  const srcRoot = resolve(root, srcDir);
  let cache = null;

  const resolveSpecifier = (fromFile, specifier) => {
    let base;
    if (specifier.startsWith("@/")) base = join(srcRoot, specifier.slice(2));
    else if (specifier.startsWith(".")) base = resolve(dirname(fromFile), specifier);
    else return null;
    for (const suffix of RESOLVE_SUFFIXES) {
      const candidate = base + suffix;
      if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
    }
    return null;
  };

  function build() {
    /** @type {Map<string, {file: string, line: number, names: string[]}[]>} */
    const importers = new Map();
    const sources = new Map();
    for (const file of walk(srcRoot, SOURCE_EXTENSIONS)) {
      const text = readFileSync(file, "utf8");
      sources.set(file, text);
      const add = (specifier, index, names) => {
        const target = resolveSpecifier(file, specifier);
        if (!target) return;
        if (!importers.has(target)) importers.set(target, []);
        importers.get(target).push({ file, line: lineOf(text, index), names });
      };
      for (const match of text.matchAll(STATIC_IMPORT)) {
        add(match[2], match.index + match[0].search(/\S/), importedNames(match[1]));
      }
      for (const match of text.matchAll(DYNAMIC_IMPORT)) add(match[1], match.index, []);
    }

    const docs = [];
    for (const entry of docGlobs) {
      const full = resolve(root, entry);
      const files = existsSync(full) && statSync(full).isDirectory() ? walk(full, [".md"]) : existsSync(full) ? [full] : [];
      for (const file of files) docs.push({ file, lines: readFileSync(file, "utf8").split("\n") });
    }
    return { importers, sources, docs };
  }

  const get = () => (cache ??= build());

  function definitionLine(file, name) {
    if (!name || !/^[A-Za-z_$][\w$]*$/.test(name)) return 1;
    let text;
    try {
      text = get().sources.get(file) ?? readFileSync(file, "utf8");
    } catch {
      return 1;
    }
    const match = text.match(new RegExp(`(?:function|const|let|class)\\s+${name}\\b`));
    return match ? lineOf(text, match.index) : 1;
  }

  /** جاهایی که `<Name` در فایلِ مصرف‌کننده آمده (حداکثر ۵ خط). */
  function renderLines(text, names) {
    const lines = [];
    const tags = names.filter((name) => /^[A-Z]/.test(name));
    if (tags.length === 0) return lines;
    const pattern = new RegExp(`<(${tags.join("|")})[\\s/>]`, "g");
    for (const match of text.matchAll(pattern)) {
      lines.push(lineOf(text, match.index));
      if (lines.length === 5) break;
    }
    return lines;
  }

  function docMentions(file) {
    const rel = relative(root, file).split(sep).join("/");
    const name = basename(file, extname(file));
    const needles = [rel, `\`${name}\``, `${name}.jsx`, `${name}.js`];
    const mentions = [];
    for (const doc of get().docs) {
      let heading = "";
      doc.lines.forEach((text, index) => {
        if (/^#{1,4}\s/.test(text)) heading = text.replace(/^#+\s*/, "");
        if (needles.some((needle) => text.includes(needle))) {
          mentions.push({
            file: doc.file,
            rel: relative(root, doc.file).split(sep).join("/"),
            line: index + 1,
            heading,
            text: text.trim().slice(0, 220),
          });
        }
      });
    }
    return mentions.slice(0, 40);
  }

  /**
   * خطِ دقیقِ تگ. React Compiler گره‌های JSXِ تازه می‌سازد که جای اصلی ندارند و Babel آن‌ها را
   * چند خط *پایین‌تر*، داخلِ همان تگ، می‌گذارد (۳۱۶ به‌جای ۳۰۳). پس از خطِ گزارش‌شده رو به بالا
   * نزدیک‌ترین `<Name` را می‌گیریم؛ اگر نام نخورد (تگِ متغیر مثلِ `<Comp`) نزدیک‌ترین تگِ باز.
   */
  function locate(file, line, name) {
    let text;
    try {
      text = get().sources.get(file) ?? readFileSync(file, "utf8");
    } catch {
      return line;
    }
    const lines = text.split("\n");
    const from = Math.min(line, lines.length) - 1;
    const stop = Math.max(0, from - LOCATE_WINDOW);
    const exact = new RegExp(`<${name.replace(/[.$]/g, "\\$&")}(?=[\\s/>]|$)`);
    // Radix و مانندش: نامِ نمایشیِ `SelectItem` در کد `<SelectPrimitive.Item` است.
    const member = (text) =>
      [...text.matchAll(/<([A-Za-z_$][\w$]*)\.([A-Za-z_$][\w$]*)(?=[\s/>]|$)/g)].some(
        ([, object, property]) =>
          name.endsWith(property) && name.length > property.length && object.startsWith(name.slice(0, -property.length)),
      );
    for (let index = from; index >= stop; index--) if (exact.test(lines[index]) || member(lines[index])) return index + 1;
    for (let index = from; index >= stop; index--) if (/<[A-Za-z]/.test(lines[index])) return index + 1;
    return line;
  }

  return {
    locate,

    /** هر تغییر در `src/` یا سندها؛ ساختِ دوباره تا درخواستِ بعدی عقب می‌افتد. */
    invalidate(changedFile) {
      if (!cache) return;
      if (changedFile.startsWith(srcRoot) || changedFile.endsWith(".md")) cache = null;
    },

    /**
     * اطلاعاتِ یک فایل برای پنلِ inspector؛ فایلِ بیرون از `src/` خطا نیست، فقط چیزی ندارد.
     * `name` (اختیاری): خطِ تعریفِ همان کامپوننت در فایل (`function X`، `const X =`).
     */
    info(file, name) {
      const absolute = resolve(file);
      const { importers, sources } = get();
      const usages = (importers.get(absolute) ?? [])
        .map((entry) => ({
          file: entry.file,
          rel: relative(root, entry.file).split(sep).join("/"),
          importLine: entry.line,
          renderLines: renderLines(sources.get(entry.file) ?? "", entry.names),
        }))
        .sort((a, b) => a.rel.localeCompare(b.rel));
      return {
        file: absolute,
        rel: relative(root, absolute).split(sep).join("/"),
        definitionLine: definitionLine(absolute, name),
        usages,
        docs: docMentions(absolute),
      };
    },
  };
}
