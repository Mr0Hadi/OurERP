import { describe, expect, it } from "vitest";
import { documentProductMap, returnEffectsOf, trackedLookup, withProductInfo } from "./productInfo";

describe("اطلاعاتِ کالا از ردیف‌های سند", () => {
  const items = [{ productId: 82, requiresUnitTracking: true, brand: "تست", imageKey: "a.png", imageUrl: "u" }];
  const effects = [
    { productId: "86", requiresUnitTracking: false, brand: "ایساکو" },
    { productId: null, requiresUnitTracking: null }, // اثرِ پولی
  ];

  it("نقشه از چند فهرست؛ اثرِ پولی کنار می‌رود و شناسه عدد می‌شود", () => {
    const map = documentProductMap(items, effects);
    expect([...map.keys()]).toEqual([82, 86]);
    expect(trackedLookup(map)("82")).toBe(true);
    expect(trackedLookup(map)(86)).toBe(false);
    expect(trackedLookup(map)(1)).toBe(false);
  });

  it("تصویر و برند روی ردیفِ فرم", () => {
    const [row, unknown] = withProductInfo([{ productId: 82, quantity: 1 }, { productId: 5 }], documentProductMap(items));
    expect(row).toMatchObject({ quantity: 1, brand: "تست", imageKey: "a.png", imageUrl: "u" });
    expect(unknown).toMatchObject({ brand: "", imageKey: null, imageUrl: null });
  });

  it("همه‌ی اثرهای سندِ مرجوعی", () => {
    const doc = { claims: [{ resolutions: [{ effects: [{ id: 1 }] }, { effects: [{ id: 2 }] }] }, {}] };
    expect(returnEffectsOf(doc).map((effect) => effect.id)).toEqual([1, 2]);
    expect(returnEffectsOf(null)).toEqual([]);
  });
});
