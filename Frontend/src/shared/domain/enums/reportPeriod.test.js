import { describe, expect, it } from "vitest";
import { orgRolesFor, OrgRoleEnum } from "./orgRole";
import { isSaleProforma, SaleStatusEnum } from "./saleStatus";
import { DEFAULT_REPORT_PERIOD, PREVIOUS_PERIOD_LABELS, REPORT_PERIOD_OPTIONS, formatPeriodLabel, formatPeriodRange } from "./reportPeriod";

// ۲۰۲۶-۰۹-۲۳ = ۱ مهر ۱۴۰۵ (نیمه‌ی دوم، پاییز)؛ ۲۰۲۶-۰۳-۲۱ = ۱ فروردین ۱۴۰۵.
describe("برچسبِ بازه‌ی گزارش", () => {
  it("هر سطح برچسبِ خودش", () => {
    const labels = [0, 1, 2, 3, 4, 5].map((type) => formatPeriodLabel("2026-09-23T00:00:00Z", type));
    expect(labels).toEqual(["۱ مهر", "۱ مهر", "مهر ۰۵", "پاییز ۰۵", "نیمه دوم ۰۵", "۱۴۰۵"]);
    expect(formatPeriodLabel("2026-03-21", 3)).toBe("بهار ۰۵");
    expect(formatPeriodLabel("2026-03-21", 4)).toBe("نیمه اول ۰۵");
    expect(formatPeriodLabel("2026-09-23", 99)).toBe("مهر ۰۵");
  });

  it("ورودیِ بی‌معنا خالی؛ مرزِ باز یک روز عقب", () => {
    expect([formatPeriodLabel(null, 2), formatPeriodLabel("bad", 2), formatPeriodRange(null)]).toEqual(["", "", ""]);
    expect(formatPeriodRange("2026-09-23", "2026-10-23")).toBe("۱۴۰۵/۰۷/۰۱ تا ۱۴۰۵/۰۷/۳۰");
    expect(formatPeriodRange("2026-09-23")).toBe("۱۴۰۵/۰۷/۰۱");
    expect(formatPeriodRange("2026-09-23", "bad")).toBe("۱۴۰۵/۰۷/۰۱");
  });

  it("گزینه‌ها و مبنای مقایسه برای هر سطح", () => {
    expect(REPORT_PERIOD_OPTIONS.map((option) => Number(option.value))).toEqual([0, 1, 2, 3, 4, 5]);
    expect(Object.keys(PREVIOUS_PERIOD_LABELS).map(Number)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(DEFAULT_REPORT_PERIOD).toBe(2);
  });
});

describe("کمک‌های enum", () => {
  it("نقشِ مجاز با تیم یا بی تیم؛ پیش‌فاکتور با وضعیتِ رشته‌ای", () => {
    expect(orgRolesFor(3)).toContain(OrgRoleEnum.TEAM_HEAD);
    expect(orgRolesFor(null)).toContain(OrgRoleEnum.DEPARTMENT_HEAD);
    expect(orgRolesFor(null)).not.toContain(OrgRoleEnum.TEAM_HEAD);
    expect([isSaleProforma(String(SaleStatusEnum.PROFORMA)), isSaleProforma(SaleStatusEnum.CANCELLED)]).toEqual([true, false]);
  });
});
