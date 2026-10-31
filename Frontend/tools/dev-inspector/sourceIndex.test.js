import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createSourceIndex } from "./sourceIndex.js";

/** یک پروژه‌ی کوچکِ موقت، تا تست به کدِ واقعیِ برنامه وابسته نباشد. */
let root;
const write = (path, text) => {
  const full = join(root, path);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, text);
};

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), "dev-inspector-"));
  write(
    "src/ui/Button.jsx",
    ["import { Slot } from 'radix-ui';", "", "export function Button({ asChild, ...props }) {", "  const Comp = asChild ? Slot : 'button';", "  return (", "    <Comp", '      data-slot="button"', "      {...props}", "    />", "  );", "}", ""].join("\n"),
  );
  write(
    "src/ui/select.jsx",
    ["function SelectItem({ children }) {", "  return (", "    <SelectPrimitive.Item>", "      <span />", "      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>", "    </SelectPrimitive.Item>", "  );", "}", ""].join("\n"),
  );
  write(
    "src/pages/Page.jsx",
    ['import { Button } from "@/ui/Button";', "", "export default function Page() {", "  return (", "    <div>", "      <Button", '        type="submit"', "      >", "        <Icon />", "      </Button>", "      <Button />", "    </div>", "  );", "}", ""].join("\n"),
  );
  write(
    "src/pages/Other.jsx",
    ['import { Button as Action } from "../ui/Button.jsx";', 'const Lazy = () => import("./Page");', "export const Other = () => <Action />;", ""].join("\n"),
  );
  write(
    "docs/architecture/catalog.md",
    ["# کاتالوگ", "", "## ui", "", "| `Button` | دکمه |", "", "مسیر: src/pages/Page.jsx", ""].join("\n"),
  );
  write("CLAUDE.md", "بی‌ربط\n");
  write(
    "src/constants/nav.js",
    ["export const nav = [", '  { title: "لیست خرید ها", url: "/purchases" },', '  { title: "خرید", items: [] },', "];", ""].join("\n"),
  );
  write("src/pages/Help.jsx", ["export const Help = () => (", "  <p>", "    راهنمای   لیست خرید ها و فروش", "  </p>", ");", ""].join("\n"));
  write("src/constants/nav.test.js", 'it("لیست خرید ها", () => {});\n');
});

afterAll(() => rmSync(root, { recursive: true, force: true }));

const file = (path) => join(root, path);

describe("locate — خطِ دقیق پس از جابه‌جاییِ React Compiler", () => {
  it("از خطِ گزارش‌شده رو به بالا نزدیک‌ترین <Name", () => {
    const index = createSourceIndex({ root });
    expect(index.locate(file("src/pages/Page.jsx"), 9, "Button")).toBe(6);
    expect(index.locate(file("src/pages/Page.jsx"), 11, "Button")).toBe(11);
  });

  it("تگِ متغیر (<Comp): نزدیک‌ترین تگِ باز", () => {
    expect(createSourceIndex({ root }).locate(file("src/ui/Button.jsx"), 8, "button")).toBe(6);
  });

  it("نامِ نمایشیِ Radix با <X.Y جور می‌شود، نه با تگِ نزدیک‌ترِ بی‌ربط", () => {
    expect(createSourceIndex({ root }).locate(file("src/ui/select.jsx"), 5, "SelectItem")).toBe(3);
  });

  it("فایلِ ناموجود همان خط را برمی‌گرداند", () => {
    expect(createSourceIndex({ root }).locate(file("src/nope.jsx"), 12, "X")).toBe(12);
  });
});

describe("info — جاهای استفاده، خطِ تعریف و سندها", () => {
  it("importِ alias، نسبی با نامِ دیگر، و import()", () => {
    const info = createSourceIndex({ root }).info(file("src/ui/Button.jsx"), "Button");
    expect(info.rel).toBe("src/ui/Button.jsx");
    expect(info.definitionLine).toBe(3);
    expect(info.usages.map((usage) => [usage.rel, usage.importLine, usage.renderLines])).toEqual([
      ["src/pages/Other.jsx", 1, [3]],
      ["src/pages/Page.jsx", 1, [6, 11]],
    ]);
    const page = createSourceIndex({ root }).info(file("src/pages/Page.jsx"), "Page");
    expect(page.usages).toEqual([expect.objectContaining({ rel: "src/pages/Other.jsx", importLine: 2, renderLines: [] })]);
  });

  it("سند: نامِ کامپوننت در backtick یا مسیرِ فایل، با عنوانِ بخش", () => {
    const index = createSourceIndex({ root });
    expect(index.info(file("src/ui/Button.jsx"), "Button").docs).toEqual([
      expect.objectContaining({ rel: "docs/architecture/catalog.md", line: 5, heading: "ui" }),
    ]);
    expect(index.info(file("src/pages/Page.jsx")).docs.map((doc) => doc.line)).toEqual([7]);
  });

  it("invalidate: فایلِ تازه بعد از باطل شدن دیده می‌شود", () => {
    const index = createSourceIndex({ root });
    expect(index.info(file("src/ui/Button.jsx")).usages).toHaveLength(2);
    write("src/pages/Third.jsx", 'import { Button } from "@/ui/Button";\nexport const T = () => <Button />;\n');
    expect(index.info(file("src/ui/Button.jsx")).usages).toHaveLength(2);
    index.invalidate(file("src/pages/Third.jsx"));
    expect(index.info(file("src/ui/Button.jsx")).usages).toHaveLength(3);
  });
});

describe("findText — متنِ روی صفحه در کد", () => {
  it("رشته‌ی کامل اول، بعد جزئی؛ فاصله‌ها یکسان و تست‌ها بیرون", () => {
    const hits = createSourceIndex({ root }).findText("  لیست   خرید ها ");
    expect(hits.map((hit) => [hit.rel, hit.line, hit.exact])).toEqual([
      ["src/constants/nav.js", 2, true],
      ["src/pages/Help.jsx", 3, false],
    ]);
    expect(hits[0].text).toBe('{ title: "لیست خرید ها", url: "/purchases" },');
  });

  it("متنِ کوتاهِ داخلِ متنِ دیگر هم پیدا می‌شود ولی کامل‌ها بالاترند", () => {
    const hits = createSourceIndex({ root }).findText("خرید");
    expect(hits[0]).toMatchObject({ rel: "src/constants/nav.js", line: 3, exact: true });
    expect(hits.filter((hit) => hit.exact)).toHaveLength(1);
  });

  it("`near`: فایلی که زنجیره‌ی کامپوننت import می‌کند بالاتر از رشته‌ی کاملِ بی‌ربط", () => {
    write("src/pages/Other2.jsx", 'export const X = () => <b>لیست خرید ها و بیشتر</b>;\nexport const Y = "خرید";\n');
    write("src/layout/Menu.jsx", 'import { nav } from "@/constants/nav";\nexport const Menu = () => nav.map((n) => n.title);\n');
    const index = createSourceIndex({ root });
    const plain = index.findText("خرید");
    expect(plain[0].rel).toBe("src/constants/nav.js");
    const near = index.findText("خرید", { near: [file("src/layout/Menu.jsx")] });
    expect(near[0]).toMatchObject({ rel: "src/constants/nav.js", exact: true, related: true });
    expect(near.find((hit) => hit.rel === "src/pages/Other2.jsx")).toMatchObject({ exact: true, related: false });
  });

  it("داده‌ی لایه‌ی نزدیک‌تر بالاتر از داده‌ی لایه‌ی دورتر", () => {
    write("src/layout/Crumbs.js", 'export const crumbs = { a: "خرید" };\n');
    write("src/layout/Shell.jsx", 'import { crumbs } from "./Crumbs";\nimport { Menu } from "./Menu";\nexport const Shell = () => <Menu c={crumbs} />;\n');
    const index = createSourceIndex({ root });
    const hits = index.findText("خرید", { near: [file("src/layout/Menu.jsx"), file("src/layout/Shell.jsx")] });
    expect(hits.slice(0, 2).map((hit) => hit.rel)).toEqual(["src/constants/nav.js", "src/layout/Crumbs.js"]);
  });

  it("متنِ خیلی کوتاه یا خالی جست‌وجو نمی‌شود", () => {
    const index = createSourceIndex({ root });
    expect([index.findText(""), index.findText("x"), index.findText(null)]).toEqual([[], [], []]);
  });
});
