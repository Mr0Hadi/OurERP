import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OrgRoleEnum } from "@/shared/domain/enums/orgRole";
// `ReportPeriodTypeEnum` export نیست؛ ۲ = ماهانه.
const MONTHLY = 2;
import { buildDashboardContext } from "./dashboardContext";
import { buildKpis, buildPeriodSeries, buildRevenueBreakdown, describeRange, periodOverPeriodChange, profitMargin } from "./dashboardMetrics";
import { buildScopeKpis, buildScopeSeries, rankMembers, scopeSides } from "./scopeMetrics";
import { WIDGETS, WIDGETS_BY_ID, availableWidgetIds, defaultLayout, packRows, resolveLayout } from "./widgetRegistry";
import { QUICK_ACTIONS, quickActionsFor } from "./quickActions";
import { WORK_QUEUES, workQueuesFor } from "./workQueues";

const ctx = (role, permissions = [], user = {}) =>
  buildDashboardContext({ firstName: "سارا", lastName: "رضایی", role, teamId: 1, ...user }, new Set(permissions));

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-28T10:00:00Z"));
});
afterEach(() => vi.useRealTimers());

describe("کاربر کیست", () => {
  it("مسئولِ تیم فقط با تیم؛ دسترسی‌ها", () => {
    expect(ctx(OrgRoleEnum.TEAM_HEAD).isTeamLead).toBe(true);
    expect(ctx(OrgRoleEnum.TEAM_DEPUTY, [], { teamId: null }).isTeamLead).toBe(false);
    expect(ctx(OrgRoleEnum.DEPARTMENT_DEPUTY).isDepartmentLead).toBe(true);
    const seller = ctx(OrgRoleEnum.MEMBER, ["SaleInPerson", "ReportView"]);
    expect([seller.sells, seller.buys, seller.canSeeOrg, seller.fullName]).toEqual([true, false, true, "سارا رضایی"]);
    expect(seller.canAll("SaleInPerson", "SaleView")).toBe(false);
    expect(buildDashboardContext(null, null).role).toBe(OrgRoleEnum.MEMBER);
  });
});

describe("سری‌ها و شاخص‌ها", () => {
  const sales = [
    { periodStart: "2026-08-23", periodEnd: "2026-09-23", revenue: 100, netProfit: 20, costOfGoodsSold: 80, salesCount: 2, totalInvoiceAmount: 110 },
    { periodStart: "2026-09-23", periodEnd: "2026-10-23", revenue: 150, netProfit: 30, costOfGoodsSold: 120, salesCount: 3, totalInvoiceAmount: 160 },
    { periodStart: "2026-10-23", periodEnd: "2026-11-22", revenue: 10, netProfit: 1, salesCount: 1 },
  ];
  const purchases = [{ periodStart: "2026-07-23", periodEnd: "2026-08-23", totalInvoiceAmount: 500, purchasesCount: 1, totalReceivedValue: 400 }];

  it("اجتماعِ بازه‌ها، مرتب، طرفِ غایب صفر، بازه‌ی باز علامت‌دار", () => {
    const series = buildPeriodSeries(sales, purchases, MONTHLY);
    expect(series.map((row) => row.key)).toEqual(["2026-07-23", "2026-08-23", "2026-09-23", "2026-10-23"]);
    expect(series[0].values).toMatchObject({ revenue: 0, purchaseInvoiceAmount: 500, totalReceivedValue: 400 });
    expect(series[3].isOpen).toBe(true);
    expect(series[3].tooltipLabel).toContain("هنوز تمام نشده");
    expect(series[2].isOpen).toBeUndefined();
  });

  it("رشد فقط بینِ بازه‌های تمام‌شده؛ مبنای صفر = null", () => {
    const series = buildPeriodSeries(sales, purchases, MONTHLY);
    expect(periodOverPeriodChange(series, "revenue")).toBe(50);
    expect(periodOverPeriodChange(series, "purchasesCount")).toBe(null);
    expect(periodOverPeriodChange(series.slice(0, 1), "revenue")).toBe(null);
    expect([profitMargin(30, 150), profitMargin(5, 0)]).toEqual([20, null]);
  });

  it("کارت‌ها و دونات", () => {
    const series = buildPeriodSeries(sales, purchases, MONTHLY);
    const kpis = Object.fromEntries(buildKpis(series, MONTHLY).map((kpi) => [kpi.key, kpi]));
    expect(kpis.revenue).toMatchObject({ value: 260, change: 50, spark: [0, 100, 150, 10] });
    expect(kpis.margin.value).toBeCloseTo((51 / 260) * 100);
    expect(kpis.margin.spark).toEqual([0, 20, 20, 10]);
    expect(kpis.revenue.comparison).not.toBe("بازه قبل");
    expect(buildRevenueBreakdown(series).map((part) => part.value)).toEqual([200, 0, 51]);
    expect(describeRange(series)).toBe("۱۴۰۵/۰۵/۰۱ تا ۱۴۰۵/۰۸/۳۰");
    expect(describeRange([])).toBe("");
  });
});

describe("گزارشِ محدوده‌دار", () => {
  const series = buildScopeSeries([
    { periodStart: "2026-09-23", periodEnd: "2026-10-23", salesCount: 2, saleInvoiceAmount: 100 },
    { periodStart: "2026-08-23", periodEnd: "2026-09-23", salesCount: 1, saleInvoiceAmount: 50 },
  ], MONTHLY);

  it("مرتب و طرف‌ها: شخصی از دسترسی، تیم از داده، هیچ = هر دو", () => {
    expect(series.map((row) => row.key)).toEqual(["2026-08-23", "2026-09-23"]);
    expect(scopeSides(series, { sells: false, buys: true, isPersonal: true })).toEqual({ showSales: true, showPurchases: true });
    expect(scopeSides(series, { sells: false, buys: true, isPersonal: false })).toEqual({ showSales: true, showPurchases: false });
    expect(scopeSides([], { isPersonal: false })).toEqual({ showSales: true, showPurchases: true });
  });

  it("کارت‌ها و رتبه‌ی اعضا", () => {
    const kpis = buildScopeKpis(series, MONTHLY, { showSales: true, showPurchases: false });
    expect(kpis.map((kpi) => [kpi.key, kpi.value, kpi.change])).toEqual([["saleInvoiceAmount", 150, 100], ["salesCount", 3, 100]]);
    const ranked = rankMembers([{ id: 1, saleInvoiceAmount: 25 }, { id: 2, saleInvoiceAmount: 75 }], { showSales: true });
    expect(ranked.map((m) => [m.id, m.share])).toEqual([[2, 75], [1, 25]]);
    expect(rankMembers([{ id: 1 }], { showSales: false })[0].share).toBe(0);
  });
});

describe("ویجت‌ها", () => {
  const ALL = [...new Set([...QUICK_ACTIONS.flatMap((a) => [a.permission].flat()), ...WORK_QUEUES.flatMap((q) => q.permissions), "ReportView"])];

  it("شناسه‌ها یکتا؛ کاشی‌ها و صف‌ها با دسترسی", () => {
    expect(new Set(WIDGETS.map((w) => w.id)).size).toBe(WIDGETS.length);
    expect(new Set(WORK_QUEUES.map((q) => q.id)).size).toBe(WORK_QUEUES.length);
    expect(new Set(QUICK_ACTIONS.map((a) => a.id)).size).toBe(QUICK_ACTIONS.length);
    const clerk = ctx(OrgRoleEnum.MEMBER, ["PurchaseReceive"]);
    expect(workQueuesFor(clerk)).toEqual([]);
    expect(quickActionsFor(clerk).map((a) => a.id)).toEqual(["receive"]);
    expect(workQueuesFor(ctx(OrgRoleEnum.MEMBER, ["PurchaseReceive", "PurchaseView"])).map((q) => q.id)).toEqual(["receive"]);
  });

  it("پیش‌فرض: مسئولِ واحد پیش از تیم پیش از خود؛ جدول خاموش", () => {
    const boss = ctx(OrgRoleEnum.DEPARTMENT_HEAD, ALL);
    expect(defaultLayout(boss).order.slice(0, 5)).toEqual(["welcome", "quickActions", "workQueues", "departmentPerformance", "myPerformance"]);
    expect(defaultLayout(boss).hidden).toEqual(["orgPeriodTable"]);
    expect(defaultLayout(ctx(OrgRoleEnum.MEMBER)).order).toEqual(["welcome"]);
    // هر ویجتِ در دسترس در پیش‌فرض جا دارد.
    expect(defaultLayout(boss).order.sort()).toEqual(availableWidgetIds(boss).sort());
  });

  it("چیدمانِ ذخیره‌شده: حذفِ ناموجود، تازه کنارِ همسایه، قفل خاموش نمی‌شود", () => {
    const user = ctx(OrgRoleEnum.MEMBER, ["ReportView", "SaleCreate"]);
    const saved = { order: ["orgKpis", "welcome", "teamPerformance"], hidden: ["welcome", "orgKpis"] };
    const { order, hidden } = resolveLayout(user, saved);
    expect(order).toEqual([
      "orgKpis", "orgSalesVsPurchase", "orgRevenueBreakdown", "orgSalesTrend", "topSellers", "orgPeriodTable",
      "welcome", "quickActions", "myPerformance",
    ]);
    expect(hidden.sort()).toEqual(["orgKpis", "orgPeriodTable"]);
    expect(resolveLayout(user, { order: ["orgPeriodTable", "welcome"], hidden: [] }).hidden).toEqual([]);
    expect(resolveLayout(user, null)).toEqual(defaultLayout(user));
  });

  it("packRows: آخرینِ ردیفِ ناقص کشیده می‌شود", () => {
    expect(packRows(["workQueues", "quickActions"])).toEqual({ workQueues: 2, quickActions: 1 });
    expect(packRows(["workQueues", "orgKpis", "topSellers"])).toEqual({ workQueues: 3, orgKpis: 3, topSellers: 3 });
    expect(packRows(["topSellers", "orgRevenueBreakdown", "nope"])).toEqual({ topSellers: 1, orgRevenueBreakdown: 2, nope: 3 });
    for (const widget of WIDGETS) expect(["full", "wide", "narrow"]).toContain(WIDGETS_BY_ID[widget.id].span);
  });
});
