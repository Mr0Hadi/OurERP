import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * قاعده‌ی پروژه: enumهای فرانت **همان اعدادِ بکند** را دارند (نام‌های عضو هم یکی‌اند). این تست
 * enumهای C#ِ `Backend-Net/` را می‌خواند و هر enumِ فرانت را با همتایش مقایسه می‌کند؛ اگر سرور
 * عضوی را جابه‌جا یا حذف کند، اینجا قرمز می‌شود نه در گزارشِ کاربر. enumِ تازه‌ی فرانت باید در
 * `BACKEND_NAME` یا `FRONTEND_ONLY` بیاید (تستِ اول). بی `Backend-Net/` (کلونِ فقط فرانت) رد می‌شود.
 */
const BACKEND = resolve(import.meta.dirname, "../../../../../Backend-Net");
const hasBackend = existsSync(BACKEND);

/** نامِ همتای بکند وقتی با نامِ فرانت فرق دارد. */
const BACKEND_NAME = {
  SaleStatusEnum: "SalesStatusEnum",
  ChequeStatusEnum: "PaymentCheckStatusEnum",
  UnitActionEnum: "ProductUnitActionEnum",
  UnitLabelStateEnum: "ProductUnitLabelStateEnum",
  SETTING_TYPE: "SystemSettingTypeEnum",
  EFFECT_DIRECTIONS: "ReturnEffectDirectionEnum",
  EFFECT_STATUSES: "ReturnEffectStatusEnum",
  RETURN_PROBLEMS: "ReturnProblemEnum",
  // زیرمجموعه‌های هر سمت از همان `ReturnProblemEnum`.
  PURCHASE_RETURN_PROBLEMS: "ReturnProblemEnum",
  SALES_RETURN_PROBLEMS: "ReturnProblemEnum",
  OBSERVATION_PROBLEMS: "ReturnProblemEnum",
  CLAIM_SCOPES: "ReturnClaimScopeEnum",
  OFF_SCOPE_KINDS: "ReturnOffScopeKindEnum",
  RETURN_STATUSES: "ReturnStatusEnum",
};

/** enumهایی که عمداً همتای بکند ندارند، با دلیل. */
const FRONTEND_ONLY = {
  DepartmentEnum: "واحدها ردیفِ جدول‌اند؛ فقط نگاشتِ آیکنِ سایدبار با شناسه‌های seed",
  MONEY_DIRECTIONS: "محورِ داخلیِ فرمِ تصمیمِ مرجوعی",
  RETURN_SIDES: "خرید/فروش در فرانت؛ سرور دو کنترلرِ جدا دارد",
};

// ─── خواندنِ enumهای C# ─────────────────────────────────────────────────────

function csFiles(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === "bin" || name === "obj" || name.startsWith(".")) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) csFiles(full, out);
    else if (name.endsWith(".cs")) out.push(full);
  }
  return out;
}

function evaluate(expression, members) {
  const text = expression.trim();
  if (/^-?\d+$/.test(text)) return Number(text);
  if (/^0x[0-9a-f]+$/i.test(text)) return Number.parseInt(text, 16);
  const shift = text.match(/^(\d+)\s*<<\s*(\d+)$/);
  if (shift) return Number(shift[1]) << Number(shift[2]);
  if (text in members) return members[text];
  throw new Error(`عبارتِ ناشناخته در enum: ${text}`);
}

/** `{ EnumName: { MEMBER: number } }` از متنِ C# (کامنت و attribute حذف، شماره‌گذاریِ ضمنی). */
export function parseCsEnums(source) {
  const clean = source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "")
    .replace(/\[[^\]]*\]/g, "");
  const enums = {};
  for (const [, name, body] of clean.matchAll(/\benum\s+(\w+)\s*(?::\s*\w+)?\s*\{([^}]*)\}/g)) {
    const members = {};
    let next = 0;
    for (const part of body.split(",")) {
      const entry = part.trim();
      if (!entry) continue;
      const [member, expression] = entry.split("=");
      const value = expression === undefined ? next : evaluate(expression, members);
      members[member.trim()] = value;
      next = value + 1;
    }
    enums[name] = members;
  }
  return enums;
}

const backendEnums = hasBackend
  ? Object.assign({}, ...csFiles(BACKEND).map((file) => parseCsEnums(readFileSync(file, "utf8"))))
  : {};

// ─── enumهای فرانت ──────────────────────────────────────────────────────────

const modules = import.meta.glob(
  ["/src/**/domain/**/*.js", "/src/shared/domain/enums/*.js", "!/src/**/*.test.js"],
  { eager: true },
);

const isNumericEnum = (value) =>
  value &&
  typeof value === "object" &&
  !Array.isArray(value) &&
  Object.keys(value).length > 1 &&
  Object.keys(value).every((key) => /^[A-Z][A-Z0-9_]*$/.test(key)) &&
  Object.values(value).every(Number.isInteger);

const exportedEnums = Object.entries(modules).flatMap(([path, module]) =>
  Object.entries(module)
    .filter(([, value]) => isNumericEnum(value))
    .map(([name, value]) => ({ name, value, path: path.replace("/src/", "src/") })),
);

// enumی که فقط داخلِ ماژول است (`const XEnum`، export نشده) از export دیده نمی‌شود؛ از متن خوانده می‌شود.
const hiddenEnums = Object.entries(import.meta.glob(["/src/**/*.js", "!/src/**/*.test.js"], { query: "?raw", import: "default", eager: true }))
  .flatMap(([path, source]) =>
    [...source.matchAll(/^const (\w+Enum) = Object\.freeze\(\{([^}]*)\}\)/gm)].map(([, name, body]) => ({
      name,
      value: Object.fromEntries([...body.matchAll(/^\s*([A-Z][A-Z0-9_]*):\s*(-?\d+),/gm)].map(([, member, number]) => [member, Number(number)])),
      path: path.replace("/src/", "src/"),
    })),
  )
  .filter(({ name, value }) => isNumericEnum(value) && !exportedEnums.some((entry) => entry.name === name));

const frontendEnums = [...exportedEnums, ...hiddenEnums];

const normalize = (member) => member.replace(/_/g, "").toLowerCase();

describe.skipIf(!hasBackend)("enumهای فرانت = enumهای بکند", () => {
  it("پارسرِ C#: شماره‌ی ضمنی، صریح، کامنت و attribute", () => {
    expect(parseCsEnums(`
      public enum A { [Description("x")] ONE, // c
        TWO = 5, /* block */ THREE, FOUR = 1 << 4 }
    `)).toEqual({ A: { ONE: 0, TWO: 5, THREE: 6, FOUR: 16 } });
  });

  it("هر enumِ فرانت همتای بکند دارد یا عمداً فقط‌فرانت است", () => {
    const unmapped = frontendEnums
      .filter(({ name }) => !(name in FRONTEND_ONLY))
      .filter(({ name }) => !backendEnums[BACKEND_NAME[name] ?? name])
      .map(({ name, path }) => `${name} (${path})`);
    expect(unmapped).toEqual([]);
  });

  it.each(frontendEnums.filter(({ name }) => !(name in FRONTEND_ONLY)).map((entry) => [entry.name, entry]))(
    "%s: هر عضو با همان نام و عدد در بکند",
    (_, { name, value }) => {
      const backend = backendEnums[BACKEND_NAME[name] ?? name] ?? {};
      const byName = Object.fromEntries(Object.entries(backend).map(([member, number]) => [normalize(member), number]));
      const mismatches = Object.entries(value)
        .filter(([member, number]) => byName[normalize(member)] !== number)
        .map(([member, number]) => `${member}: فرانت ${number}، بکند ${byName[normalize(member)] ?? "ندارد"}`);
      expect(mismatches).toEqual([]);
    },
  );
});
