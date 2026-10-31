import { describe, expect, it } from "vitest";
import { ROUTES } from "@/shared/constants/routes";
import { PaymentPurposeEnum } from "@/shared/domain/enums/paymentDirection";
import { TONES } from "@/shared/lib/tone";
import { ACCOUNTING_PAGE_GROUPS } from "./accountingPages";
import { AGING_BUCKETS, agingOverdue, agingTotal } from "./aging";
import { toChartData } from "./dashboardSeries";
import { DocumentSideEnum } from "./accountingEnums";
import { JOURNAL_SIDES } from "./journalSides";
import { PAYMENT_PURPOSE_FILTER_LABELS } from "./paymentPurpose";

describe("سنی‌بندی", () => {
  it("جمعِ سرور مقدم است؛ بی آن از سطل‌ها", () => {
    expect(agingTotal({ total: "900", notDue: 1 })).toBe(900);
    expect(agingTotal({ notDue: 100, days1To30: "50", days31To60: null, over90Days: 5 })).toBe(155);
    expect(agingTotal(null)).toBe(0);
    expect(agingOverdue({ overdue: 40, notDue: 1 })).toBe(40);
    expect(agingOverdue({ notDue: 100, days1To30: 50, over90Days: 5 })).toBe(55);
    expect(agingOverdue(undefined)).toBe(0);
  });

  it("پنج سطل، کلیدِ یکتا، tone معتبر", () => {
    expect(AGING_BUCKETS.map((bucket) => bucket.key)).toEqual(["notDue", "days1To30", "days31To60", "days61To90", "over90Days"]);
    for (const bucket of AGING_BUCKETS) expect(TONES).toContain(bucket.tone);
  });
});

describe("واژگانِ صفحه‌ها", () => {
  it("هر صفحه مسیرِ تعریف‌شده و یکتا دارد", () => {
    const pages = ACCOUNTING_PAGE_GROUPS.flatMap((group) => group.pages);
    const routes = new Set(Object.values(ROUTES));
    for (const page of pages) expect(routes, page.label).toContain(page.to);
    expect(new Set(pages.map((page) => page.to)).size).toBe(pages.length);
  });

  it("دو دفتر یک شکل دارند و کلیدِ مسیرشان تعریف شده", () => {
    const [sale, purchase] = [JOURNAL_SIDES[DocumentSideEnum.SALE], JOURNAL_SIDES[DocumentSideEnum.PURCHASE]];
    expect(Object.keys(sale).sort()).toEqual(Object.keys(purchase).sort());
    for (const side of [sale, purchase]) {
      expect(side.partyRoute && side.documentRoute).toBeTruthy();
      expect(Object.keys(side.statusLabels).sort()).toEqual(Object.keys(side.statusTones).sort());
    }
    expect([sale.partyIdKey, purchase.partyIdKey]).toEqual(["customerId", "supplierId"]);
  });

  it("فیلترِ هدفِ پرداخت «عادی» را هم دارد", () => {
    expect(PAYMENT_PURPOSE_FILTER_LABELS[PaymentPurposeEnum.NORMAL]).toBe("پرداختِ عادی");
    expect(Object.keys(PAYMENT_PURPOSE_FILTER_LABELS).length).toBe(Object.keys(PaymentPurposeEnum).length);
  });

  it("داده‌ی نمودار با برچسبِ شمسی", () => {
    const data = toChartData([{ periodStart: "2026-09-23", periodEnd: "2026-10-23", tax: 5 }], 2, (period) => ({ tax: period.tax }));
    expect(data).toEqual([{ key: "2026-09-23", label: expect.stringContaining("مهر"), tooltipLabel: "۱۴۰۵/۰۷/۰۱ تا ۱۴۰۵/۰۷/۳۰", values: { tax: 5 } }]);
    expect(toChartData(undefined, 2, () => ({}))).toEqual([]);
  });
});
