import { describe, expect, it } from "vitest";
import { approvedQuantity, changeDraft, checkSummary, lineNeed } from "./saleCheck";

const items = [
  { id: 1, productName: "لنت", quantity: 3, reservedQuantity: 1 },
  { id: 2, productName: "روغن", quantity: 2, reservedQuantity: 0 },
];
const base = { scans: {}, quantities: {}, issues: [], reason: "", canEdit: true };

describe("بررسیِ انبارِ پیش‌فاکتور", () => {
  it("قلمِ دست‌نخورده فقط کمبودِ رزرو را اسکن می‌خواهد؛ قلمِ تغییرکرده همه را", () => {
    expect(lineNeed(items[0])).toBe(2);
    expect(lineNeed(items[0], { 1: 2 })).toBe(2);
    expect(approvedQuantity(items[0], { 1: 0 })).toBe(0);
  });

  it("ترتیبِ مانع‌ها: دوباره‌شماری، همه صفر، دلیلِ تغییر، اسکنِ ناقص", () => {
    const issues = [{ productUnitBarcode: "x" }];
    expect(checkSummary(items, { ...base, issues, scans: { 1: ["x"] } }).blockingReason).toContain("هم اسکن و هم گزارشِ معیوب");
    expect(checkSummary(items, { ...base, quantities: { 1: 0, 2: 0 }, reason: "کم بود" }).blockingReason).toContain("همه‌ی اقلام صفر");
    expect(checkSummary(items, { ...base, quantities: { 2: 1 } }).blockingReason).toBe("دلیلِ تغییر را بنویسید.");
    const pending = checkSummary(items, { ...base, scans: { 1: ["a"] } });
    expect(pending.unscanned.map((item) => item.id)).toEqual([1, 2]);
    expect(pending.blockingReason).toContain("لنت");
    expect(pending.blockingReason).toContain("تعداد را کم کنید");
    expect(checkSummary(items, { ...base, canEdit: false, scans: { 1: ["a"] } }).blockingReason).not.toContain("تعداد را کم کنید");
  });

  it("همه اسکن شده: بی مانع؛ پیش‌نویسِ دلیل از تغییرها", () => {
    const done = checkSummary(items, { ...base, scans: { 1: ["a", "b"], 2: ["c", "d"] } });
    expect(done).toMatchObject({ blockingReason: null, changed: [], unscanned: [] });
    const { changed } = checkSummary(items, { ...base, quantities: { 2: 1 }, reason: "x" });
    expect(changeDraft(changed, { 2: 1 })).toBe("«روغن»: ۲ ← ۱");
  });
});
