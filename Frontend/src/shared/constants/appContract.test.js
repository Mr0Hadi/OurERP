import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { ROUTES } from "./routes";
import { navigationData } from "./navigationData";

/**
 * قراردادهای سیم‌کشیِ برنامه که بی تست فقط در مرورگر و با کاربرِ خاص دیده می‌شوند:
 *  - هر نامِ دسترسی که فرانت می‌سنجد عضوِ `PermissionEnum`ِ سرور است (غلطِ املایی = دکمه/منوی
 *    همیشه پنهان)؛
 *  - هر آیتمِ منو به مسیری می‌رود که route دارد، و هر `ROUTES` که route دارد یکتاست؛
 *  - کلیدهای React Query ریشه‌ی یکتا دارند (دو فیچر با یک ریشه کشِ هم را باطل می‌کنند).
 */
const SRC = resolve(import.meta.dirname, "../..");
const PERMISSION_ENUM = resolve(SRC, "../../Backend-Net/Domain/Enums/PermissionEnum.cs");

function sourceFiles(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) sourceFiles(full, out);
    else if (/\.(js|jsx)$/.test(name) && !name.includes(".test.")) out.push(full);
  }
  return out;
}
const sources = sourceFiles(SRC).map((file) => ({ rel: relative(SRC, file), text: readFileSync(file, "utf8") }));

const navItems = navigationData.navMain.flatMap((group) => [group, ...(group.items ?? [])]);
const pathOf = (url) => url.split("?")[0];

describe.skipIf(!existsSync(PERMISSION_ENUM))("نامِ دسترسی‌ها = PermissionEnum", () => {
  const backend = new Set(
    readFileSync(PERMISSION_ENUM, "utf8")
      .match(/enum\s+PermissionEnum[^{]*\{([^}]*)\}/)[1]
      .replace(/\/\/.*$/gm, "")
      .replace(/\[[^\]]*\]/g, "")
      .split(",")
      .map((entry) => entry.split("=")[0].trim())
      .filter(Boolean),
  );

  it("هر رشته در `permission:`/`permissions:`، `can()`، `allows()` و `satisfies()`", () => {
    const CONTEXT = /(?:permissions?\s*:\s*|\b(?:allows|can|canAll|satisfies)\(\s*)(\[[^\]]*\]|"[^"]*")/g;
    const unknown = [];
    let seen = 0;
    for (const { rel, text } of sources) {
      for (const [, value] of text.matchAll(CONTEXT)) {
        for (const [, name] of value.matchAll(/"([^"]+)"/g)) {
          seen += 1;
          if (!backend.has(name)) unknown.push(`${name} (${rel})`);
        }
      }
    }
    expect(seen, "اسکن چیزی پیدا نکرد؛ الگو خراب است").toBeGreaterThan(50);
    expect(unknown).toEqual([]);
  });

  it("دسترسیِ آیتم‌های منو", () => {
    const names = navItems.flatMap((item) => [item.permission ?? []].flat());
    expect(names.filter((name) => !backend.has(name))).toEqual([]);
  });
});

describe("مسیرها و منو", () => {
  const routed = new Set(
    sources.flatMap(({ text }) => [...text.matchAll(/path:\s*ROUTES\.([A-Z_]+)/g)].map(([, key]) => ROUTES[key])),
  );

  it("هر آیتمِ منو (جز والدِ دارای زیرآیتم) به مسیرِ routeدار می‌رود", () => {
    const leaves = navItems.filter((item) => !(item.items?.length > 0));
    const broken = leaves.filter((item) => !routed.has(pathOf(item.url))).map((item) => `${item.title}: ${item.url}`);
    expect(broken).toEqual([]);
  });

  it("هر `ROUTES` که route دارد تعریف شده و با / شروع می‌شود", () => {
    const keys = sources.flatMap(({ text }) => [...text.matchAll(/ROUTES\.([A-Z_]+)/g)].map(([, key]) => key));
    expect([...new Set(keys)].filter((key) => !(key in ROUTES))).toEqual([]);
    for (const [key, value] of Object.entries(ROUTES)) expect(value, key).toMatch(/^\//);
  });
});

describe("کلیدهای React Query", () => {
  const modules = import.meta.glob("/src/**/queryKeys.js", { eager: true });
  const factories = Object.entries(modules).flatMap(([path, module]) =>
    Object.entries(module)
      .filter(([, value]) => Array.isArray(value?.all))
      .map(([name, value]) => ({ name: `${name} (${path})`, keys: value })),
  );

  it("ریشه‌ها یکتا", () => {
    expect(factories.length).toBeGreaterThan(20);
    const roots = factories.map(({ keys }) => JSON.stringify(keys.all));
    const duplicates = roots.filter((root, index) => roots.indexOf(root) !== index);
    expect(duplicates).toEqual([]);
  });

  it.each(factories.map((factory) => [factory.name, factory]))("%s: هر کلید آرایه‌ای زیرِ ریشه", (_, { keys }) => {
    for (const [member, value] of Object.entries(keys)) {
      const key = typeof value === "function" ? value(1, { a: 1 }, 2) : value;
      expect(Array.isArray(key), member).toBe(true);
      expect(key.slice(0, keys.all.length), member).toEqual(keys.all);
    }
  });
});
