import { describe, expect, it } from "vitest";
import { getPartyName } from "../filters/filterUtils";
import { formatAddressFromNominatim } from "../map/nominatim";
import {
  areaPath,
  axisLabelIndices,
  barPath,
  donutArcPath,
  formatCompact,
  formatPercent,
  indexAtPosition,
  makeBandScale,
  makeValueScale,
  monotonePath,
  niceScale,
} from "./chartUtils";

describe("مقیاس", () => {
  it("تیک‌های گرد، صفر همیشه داخل، و بازه‌ی ساختگی برای همه صفر", () => {
    expect(niceScale([0, 37])).toEqual({ min: 0, max: 40, ticks: [0, 10, 20, 30, 40] });
    expect(niceScale([-15, 30])).toEqual({ min: -20, max: 40, ticks: [-20, 0, 20, 40] });
    expect(niceScale([5, 9]).ticks[0]).toBe(0);
    expect(niceScale([0, 0, NaN])).toEqual({ min: 0, max: 1, ticks: [0, 1] });
    expect(niceScale([])).toEqual({ min: 0, max: 1, ticks: [0, 1] });
    expect(niceScale([0.3, 0.1]).ticks.every((tick) => Number.isFinite(tick))).toBe(true);
  });

  it("نگاشت‌ها و اندیس زیرِ نشانگر", () => {
    const y = makeValueScale({ min: 0, max: 100, top: 0, bottom: 200 });
    expect([y(0), y(50), y(100)]).toEqual([200, 100, 0]);
    expect(makeValueScale({ min: 5, max: 5, top: 0, bottom: 10 })(5)).toBe(10);
    const band = makeBandScale({ count: 4, left: 0, right: 400 });
    expect([band.band, band.center(1), band.start(3)]).toEqual([100, 150, 300]);
    expect([indexAtPosition(-5, { count: 4, left: 0, right: 400 }), indexAtPosition(250, { count: 4, left: 0, right: 400 }), indexAtPosition(999, { count: 4, left: 0, right: 400 })]).toEqual([0, 2, 3]);
    expect(indexAtPosition(10, { count: 0, left: 0, right: 1 })).toBe(-1);
  });

  it("برچسب‌های محور: اولی و آخری همیشه، بی برخوردِ آخر", () => {
    expect(axisLabelIndices(0, 500)).toEqual([]);
    expect(axisLabelIndices(3, 900)).toEqual([0, 1, 2]);
    const twelve = axisLabelIndices(12, 360);
    expect(twelve[0]).toBe(0);
    expect(twelve.at(-1)).toBe(11);
    for (let i = 1; i < twelve.length; i++) expect(twelve[i] - twelve[i - 1]).toBeGreaterThanOrEqual(2);
  });
});

describe("مسیرهای SVG", () => {
  it("منحنی از همه‌ی نقطه‌ها می‌گذرد و در اکسترمم سرریز نمی‌کند", () => {
    expect(monotonePath([])).toBe("");
    expect(monotonePath([{ x: 1, y: 2 }])).toBe("M 1 2");
    const path = monotonePath([{ x: 0, y: 10 }, { x: 10, y: 0 }, { x: 20, y: 10 }]);
    expect(path.startsWith("M 0 10")).toBe(true);
    expect(path.endsWith("20 10")).toBe(true);
    const ys = [...path.matchAll(/-?\d+(?:\.\d+)?/g)].map(Number).filter((_, i) => i % 2 === 1);
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(0);
    expect(areaPath([{ x: 0, y: 1 }, { x: 5, y: 2 }], 9)).toMatch(/L 5 9 L 0 9 Z$/);
    expect(areaPath([], 9)).toBe("");
  });

  it("ستونِ مثبت و منفی؛ شعاع از ارتفاع بیشتر نمی‌شود", () => {
    expect(barPath({ x: 0, y: 0, width: 10, height: 20, radius: 4 })).toBe("M 0 20 L 0 4 Q 0 0 4 0 L 6 0 Q 10 0 10 4 L 10 20 Z");
    expect(barPath({ x: 0, y: 5, width: 10, height: -2, radius: 4 })).toBe("M 0 5 L 0 5 Q 0 7 2 7 L 8 7 Q 10 7 10 5 L 10 5 Z");
  });

  it("قوسِ بزرگ‌تر از نیم‌دایره پرچمِ large-arc دارد", () => {
    expect(donutArcPath({ cx: 0, cy: 0, outer: 10, inner: 5, startAngle: 0, endAngle: Math.PI * 1.5 })).toContain("A 10 10 0 1 1");
    expect(donutArcPath({ cx: 0, cy: 0, outer: 10, inner: 5, startAngle: 0, endAngle: 1 })).toContain("A 10 10 0 0 1");
  });
});

describe("قالبِ عدد", () => {
  it("فشرده با واحدِ درست، حتی وقتی گرد کردن به واحدِ بعد می‌رسد", () => {
    expect([950, 1500, 620_000_000, -2_500_000_000, null].map(formatCompact)).toEqual([
      "۹۵۰", "۱٫۵ هزار", "۶۲۰ میلیون", "\u200e\u2212۲٫۵ میلیارد", "۰",
    ]);
    expect(formatCompact(999_950)).toBe("۱ میلیون");
    expect(formatCompact(999_949)).toBe("۱ میلیون");
    expect(formatCompact(999_400)).toBe("۹۹۹ هزار");
    expect(formatCompact(999_999_999)).toBe("۱ میلیارد");
    expect(formatCompact(5e15)).toBe("۵٬۰۰۰ هزار میلیارد");
  });

  it("درصد با علامت", () => {
    expect([formatPercent(12.345), formatPercent(-3), formatPercent(3, { withSign: true }), formatPercent(0, { withSign: true })]).toEqual(["۱۲٫۳٪", "−۳٪", "+۳٪", "۰٪"]);
  });
});

describe("نام و نشانی", () => {
  it("نامِ طرف حساب به ترتیبِ اولویت", () => {
    expect(getPartyName({ fullName: "الف", companyName: "ب" })).toBe("الف");
    expect(getPartyName({ companyName: "ب" })).toBe("ب");
    expect(getPartyName({ firstName: "علی" })).toBe("علی");
    expect(getPartyName({})).toBe("بدون نام");
  });

  it("نشانیِ Nominatim: کلی به جزئی، بی کدپستی و «بخش مرکزی»، شهرستانِ تکراری حذف", () => {
    expect(formatAddressFromNominatim("خیابان آزادی, شهر تهران, بخش مرکزی شهرستان تهران, شهرستان تهران, استان تهران, 13145-111, ایران")).toBe(
      "استان تهران، شهر تهران، خیابان آزادی، ایران",
    );
    expect(formatAddressFromNominatim("روستا, شهرستان کرج, ایران")).toBe("شهرستان کرج، روستا، ایران");
    expect(formatAddressFromNominatim("ایران")).toBe("ایران");
    expect([formatAddressFromNominatim(""), formatAddressFromNominatim(" , ")]).toEqual(["", " , "]);
  });
});
