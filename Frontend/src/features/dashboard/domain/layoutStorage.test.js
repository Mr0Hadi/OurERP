import { describe, expect, it } from "vitest";
import { parseLayout, serializeLayout } from "./layoutStorage";

describe("چیدمانِ داشبورد روی سرور", () => {
  it("رفت‌وبرگشت؛ فقط order و hidden", () => {
    const text = serializeLayout({ order: ["a", "b"], hidden: ["b"], extra: 1 });
    expect(text).toBe('{"order":["a","b"],"hidden":["b"]}');
    expect(parseLayout(text)).toEqual({ order: ["a", "b"], hidden: ["b"] });
  });

  it("خالی یا نامعتبر ⇒ undefined؛ پاک‌کردن ⇒ null", () => {
    expect([parseLayout(null), parseLayout(""), parseLayout("{"), parseLayout('{"order":1}')]).toEqual([undefined, undefined, undefined, undefined]);
    expect(serializeLayout(undefined)).toBe(null);
  });
});
