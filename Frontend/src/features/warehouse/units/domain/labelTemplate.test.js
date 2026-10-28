import { describe, expect, it } from "vitest";
import {
  DEFAULT_LABEL_TEMPLATE,
  FONT_SIZES_PT,
  LABEL_LAYOUTS,
  LABEL_SIZE_PRESETS,
  MAX_LABELS_PER_ROW,
  formatLabelSize,
  isValidFontSizePt,
  labelFontPt,
  maxLabelsPerRow,
  requiredWidthMm,
  sheetGeometryOf,
} from "./labelTemplate";

const roll = (patch) => ({ ...DEFAULT_LABEL_TEMPLATE, sizeKey: "custom", custom: { layout: LABEL_LAYOUTS.ROLL, widthMm: 50, heightMm: 30 }, ...patch });

describe("ورقِ A4: برچسب‌های هر پیش‌تنظیم همان شمارِ عنوانش", () => {
  it("۶۲×۳۳ = ۲۴ (۳×۸) و ۹۳×۵۳ = ۱۰ (۲×۵)", () => {
    expect(sheetGeometryOf({ ...DEFAULT_LABEL_TEMPLATE, sizeKey: "sheet-62x33" })).toMatchObject({ columns: 3, rows: 8, perPage: 24, pageSize: "A4" });
    expect(sheetGeometryOf({ ...DEFAULT_LABEL_TEMPLATE, sizeKey: "sheet-93x53" })).toMatchObject({ columns: 2, rows: 5, perPage: 10 });
    for (const preset of LABEL_SIZE_PRESETS.filter((p) => p.layout === LABEL_LAYOUTS.SHEET)) {
      const { perPage } = sheetGeometryOf({ ...DEFAULT_LABEL_TEMPLATE, sizeKey: preset.key });
      expect(preset.label, preset.key).toContain(perPage.toLocaleString("fa-IR"));
    }
  });

  it("کلیدِ پیش‌تنظیم‌ها یکتا و اندازه‌هایشان در مرزها", () => {
    expect(new Set(LABEL_SIZE_PRESETS.map((p) => p.key)).size).toBe(LABEL_SIZE_PRESETS.length);
    for (const preset of LABEL_SIZE_PRESETS) {
      const geometry = sheetGeometryOf({ ...DEFAULT_LABEL_TEMPLATE, sizeKey: preset.key });
      expect([geometry.labelWidthMm, geometry.labelHeightMm]).toEqual([preset.widthMm, preset.heightMm]);
    }
  });
});

describe("رول", () => {
  it("تک‌برچسب: صفحه به اندازه‌ی برچسب، فاصله بی‌اثر", () => {
    expect(sheetGeometryOf(roll())).toMatchObject({
      pageSize: "50mm 30mm", columns: 1, perPage: 1, gapMm: 0, mediaWidthMm: 50, error: null, maxLabelsPerRow: MAX_LABELS_PER_ROW,
    });
  });

  it("چند برچسب: عرضِ لازم، باقیمانده و سرریز", () => {
    const fits = sheetGeometryOf(roll({ labelsPerRow: 2, horizontalGapMm: 3, mediaWidthMm: 110 }));
    expect(fits).toMatchObject({ requiredWidthMm: 103, remainingWidthMm: 7, maxLabelsPerRow: 2, error: null, pageSize: "110mm 30mm" });
    expect(sheetGeometryOf(roll({ labelsPerRow: 3, horizontalGapMm: 3, mediaWidthMm: 110 })).error).toBe("overflow");
  });

  it("ورودیِ بیرون از مرز بریده می‌شود؛ قالبِ قدیمیِ بی‌فیلد = یک برچسب", () => {
    const geometry = sheetGeometryOf(roll({ custom: { layout: LABEL_LAYOUTS.ROLL, widthMm: 5, heightMm: 900 }, labelsPerRow: 99, horizontalGapMm: 50 }));
    expect([geometry.labelWidthMm, geometry.labelHeightMm, geometry.labelsPerRow, geometry.gapMm]).toEqual([30, 100, MAX_LABELS_PER_ROW, 20]);
    expect(sheetGeometryOf(roll({ labelsPerRow: undefined, horizontalGapMm: undefined, mediaWidthMm: undefined })).labelsPerRow).toBe(1);
  });

  it("فرمول‌ها", () => {
    expect(requiredWidthMm(40, 3, 2.5)).toBe(125);
    expect(requiredWidthMm(40, 1, 99)).toBe(40);
    expect(maxLabelsPerRow(40, 2, 100)).toBe(2);
    expect(maxLabelsPerRow(200, 2, 100)).toBe(1);
  });
});

describe("اندازه‌ی متن", () => {
  it("مقدارِ دقیقِ معتبر، وگرنه پیش‌تنظیم", () => {
    expect(labelFontPt({ fontSizePt: "10", fontScale: "small" })).toBe(10);
    expect(labelFontPt({ fontSizePt: 3, fontScale: "small" })).toBe(FONT_SIZES_PT.small);
    expect(labelFontPt({ fontSizePt: null, fontScale: "large" })).toBe(9);
    expect(labelFontPt({ fontSizePt: "", fontScale: "عجیب" })).toBe(FONT_SIZES_PT.medium);
    expect([4, 16, "8.5"].map(isValidFontSizePt)).toEqual([true, true, true]);
    expect([3.9, 16.1, "x", null, "", undefined].map(isValidFontSizePt)).toEqual([false, false, false, false, false, false]);
  });

  it("اندازه با ترتیبِ چپ‌به‌راست درونِ متنِ فارسی", () => {
    expect(formatLabelSize(62, 33)).toBe("⁦۶۲×۳۳⁩");
  });
});
