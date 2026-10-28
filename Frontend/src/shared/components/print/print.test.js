import { describe, expect, it } from "vitest";
import { INVOICE_COLUMNS, INVOICE_PRINT_DEFAULTS, INVOICE_SECTIONS, enabledColumnCount, issuerLabelOf, printKindOf } from "../invoice/print/invoicePrintSettings";
import {
  DEFAULT_PAPER_SETTINGS as BASE,
  MARGIN_PRESETS,
  ORIENTATIONS,
  PAPER_KEYS,
  PAPER_LIMITS,
  fixedPagePrintOptions,
  flowPageCount,
  flowPrintOptions,
  formatPaperSize,
  pageGeometryOf,
  papersFor,
  pxToMm,
} from "./paper";
import { DEFAULT_SHEET_PRESET, getSheetPreset, paginateItems } from "./sheetPresets";
import { TEXT_SCALES, baseFontPt } from "./typography";

describe("هندسه‌ی صفحه", () => {
  it("A4 عمودی با حاشیه‌ی معمولی", () => {
    expect(pageGeometryOf(BASE)).toEqual({
      paperKey: "A4", isRoll: false, orientation: "portrait", widthMm: 210, heightMm: 297, marginMm: 12, contentWidthMm: 186, contentHeightMm: 273,
    });
  });

  it("افقی ضلعِ بلند را عرض می‌کند؛ رول جهت ندارد و حاشیه‌ی کوچک‌تر", () => {
    expect(pageGeometryOf({ ...BASE, orientation: ORIENTATIONS.LANDSCAPE })).toMatchObject({ widthMm: 297, heightMm: 210 });
    const roll = pageGeometryOf({ ...BASE, paperKey: PAPER_KEYS.ROLL_58, orientation: ORIENTATIONS.LANDSCAPE });
    expect(roll).toMatchObject({ isRoll: true, orientation: "portrait", widthMm: 58, heightMm: null, marginMm: 4, contentWidthMm: 50, contentHeightMm: null });
  });

  it("کاغذِ دلخواه و حاشیه‌ی دلخواه در مرزها؛ کلیدِ ناشناخته = A4", () => {
    const custom = pageGeometryOf({ ...BASE, paperKey: PAPER_KEYS.CUSTOM, customWidthMm: 5, customHeightMm: "abc", marginPreset: MARGIN_PRESETS.CUSTOM, customMarginMm: 99 });
    // عرض به حداقل، ارتفاعِ نامعتبر به ۲۹۷، حاشیه به یک‌چهارمِ عرض.
    expect(custom).toMatchObject({ paperKey: "custom", widthMm: PAPER_LIMITS.minWidthMm, heightMm: 297, marginMm: 10 });
    expect(pageGeometryOf({ ...BASE, paperKey: "B5" }).paperKey).toBe("A4");
    expect(pageGeometryOf({ ...BASE, marginPreset: "?" }).marginMm).toBe(12);
    expect(pageGeometryOf({ ...BASE, marginPreset: MARGIN_PRESETS.CUSTOM, customMarginMm: -3 }).marginMm).toBe(0);
  });

  it("شمارِ صفحه و گزینه‌های چاپ", () => {
    const a4 = pageGeometryOf(BASE);
    // ۰٫۰۰۱ِ صفحه رواداری دارد تا خطای گردکردنِ ارتفاع صفحه‌ی خالیِ اضافه نسازد.
    expect([flowPageCount(a4, 273), flowPageCount(a4, 273.2), flowPageCount(a4, 274), flowPageCount(a4, 0), flowPageCount(a4, 600)]).toEqual([1, 1, 2, 1, 3]);
    const roll = pageGeometryOf({ ...BASE, paperKey: PAPER_KEYS.ROLL_80 });
    expect(flowPageCount(roll, 5000)).toBe(1);
    expect(flowPrintOptions(roll, 100.2)).toEqual({ pageSize: "80mm 111mm", pageMarginMm: 4 });
    expect(flowPrintOptions(a4, 100)).toEqual({ pageSize: "210mm 297mm", pageMarginMm: 12 });
    expect(fixedPagePrintOptions(a4)).toEqual({ pageSize: "210mm 297mm", pageMarginMm: 0 });
  });

  it("نمایش و تبدیل", () => {
    expect(formatPaperSize(210, 297)).toBe("⁦۲۱۰×۲۹۷⁩");
    expect(formatPaperSize(80, null)).toContain("پیوسته");
    expect(pxToMm(96)).toBeCloseTo(25.4);
    expect(papersFor(["A5", "A4"]).map((p) => p.key)).toEqual(["A4", "A5"]);
    expect(papersFor().length).toBeGreaterThan(4);
  });
});

describe("برگه‌های برچسب و متن", () => {
  it("پیش‌تنظیم‌ها روی کاغذ جا می‌شوند", () => {
    for (const key of ["a4-3x8", "a4-2x5", "thermal-50x30"]) {
      const p = getSheetPreset(key);
      const usedWidth = p.columns * p.labelWidthMm + (p.columns - 1) * p.gapMm;
      const usedHeight = p.rows * p.labelHeightMm + (p.rows - 1) * p.gapMm;
      expect(usedWidth, key).toBeLessThanOrEqual(p.pageWidthMm - 2 * p.pageMarginMm);
      expect(usedHeight, key).toBeLessThanOrEqual(p.pageHeightMm - 2 * p.pageMarginMm);
      expect(p.perPage).toBe(p.columns * p.rows);
    }
    expect(getSheetPreset("?")).toBe(getSheetPreset(DEFAULT_SHEET_PRESET));
  });

  it("صفحه‌بندیِ صریح", () => {
    const preset = getSheetPreset("a4-2x5");
    expect(paginateItems(Array.from({ length: 21 }, (_, i) => i), preset).map((page) => page.length)).toEqual([10, 10, 1]);
    expect(paginateItems([], preset)).toEqual([]);
    expect([baseFontPt(TEXT_SCALES.SMALL), baseFontPt("?")]).toEqual([8, 9.5]);
  });

  it("تنظیماتِ چاپِ فاکتور", () => {
    expect(Object.keys(INVOICE_PRINT_DEFAULTS.columns).sort()).toEqual(INVOICE_COLUMNS.map((c) => c.key).sort());
    expect(Object.keys(INVOICE_PRINT_DEFAULTS.sections).sort()).toEqual(INVOICE_SECTIONS.map((s) => s.key).sort());
    expect(enabledColumnCount(INVOICE_PRINT_DEFAULTS.columns)).toBe(INVOICE_COLUMNS.length);
    expect(enabledColumnCount({ code: true, tax: false })).toBe(1);
    expect([issuerLabelOf("sale"), issuerLabelOf("saleReturn")]).toEqual(["فروشنده", "صادرکننده"]);
    expect(printKindOf("sale")).toBe("invoice-document:sale");
  });
});
