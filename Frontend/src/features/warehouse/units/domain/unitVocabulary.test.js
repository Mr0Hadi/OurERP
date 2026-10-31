import { describe, expect, it } from "vitest";
import { ProductUnitStatusEnum, UnitCustodyReasonEnum } from "@/shared/domain/enums/unitStatus";
import { ROUTES } from "@/shared/constants/routes";
import { unitOperationsFor } from "../components/unitOperations";
import {
  LABEL_FILTERS,
  REASONS_BY_ACTION,
  UNIT_ACTION_REASON_LABELS,
  UNIT_SEGMENTS,
  UNIT_SEGMENT_META,
  UnitActionEnum,
  UnitActionReasonEnum,
  UnitLabelStateEnum,
  allowedActionsOf,
  canLocate,
  daysSince,
  effectiveUnitFilters,
  needsLabel,
  noteRequired,
  purchaseReturnRouteOf,
  segmentFromLegacyView,
  segmentNeedsLabels,
  whereaboutsOf,
} from "./unitVocabulary";

const { IN_STOCK, QUARANTINED, SOLD, RETURNED_TO_SUPPLIER, SCRAPPED } = ProductUnitStatusEnum;
const { QUARANTINE, RELEASE, SCRAP } = UnitActionEnum;

describe("کارها روی دانه", () => {
  it("موجود: قرنطینه/اسقاط؛ قرنطینه: آزاد/اسقاط؛ بقیه هیچ", () => {
    expect(allowedActionsOf({ status: IN_STOCK })).toEqual([QUARANTINE, SCRAP]);
    expect(allowedActionsOf({ status: QUARANTINED })).toEqual([RELEASE, SCRAP]);
    expect(allowedActionsOf({ status: SOLD })).toEqual([]);
  });

  it("هر دلیلِ هر کار برچسب دارد", () => {
    for (const reasons of Object.values(REASONS_BY_ACTION)) {
      for (const reason of reasons) expect(UNIT_ACTION_REASON_LABELS[reason]).toBeTruthy();
    }
  });

  it("یادداشت: اسقاط، «سایر»، و آزادسازیِ قرنطینه‌ی پرداخت‌نشده", () => {
    expect(noteRequired(SCRAP, UnitActionReasonEnum.EXPIRED)).toBe(true);
    expect(noteRequired(QUARANTINE, UnitActionReasonEnum.OTHER)).toBe(true);
    expect(noteRequired(QUARANTINE, UnitActionReasonEnum.NEEDS_INSPECTION)).toBe(false);
    const unpaid = { status: QUARANTINED, custodyReason: UnitCustodyReasonEnum.EXCESS };
    const paid = { status: QUARANTINED, custodyReason: UnitCustodyReasonEnum.WAREHOUSE_HOLD };
    expect(noteRequired(RELEASE, UnitActionReasonEnum.INSPECTION_PASSED, [paid])).toBe(false);
    expect(noteRequired(RELEASE, UnitActionReasonEnum.INSPECTION_PASSED, [paid, unpaid])).toBe(true);
  });

  it("برچسب و قفسه فقط برای دانه‌ی انبار یا قرنطینه", () => {
    expect(needsLabel({ status: IN_STOCK, printCount: 0 })).toBe(true);
    expect(needsLabel({ status: IN_STOCK, printCount: 2 })).toBe(false);
    expect(needsLabel({ status: SOLD })).toBe(false);
    expect([IN_STOCK, QUARANTINED, SOLD].map((status) => canLocate({ status }))).toEqual([true, true, false]);
  });
});

describe("unitOperationsFor", () => {
  const unit = (status, patch = {}) => ({ status, printCount: 0, ...patch });

  it("کارها با شمار و قفلِ دسترسی", () => {
    const ops = unitOperationsFor([unit(IN_STOCK), unit(QUARANTINED, { purchaseId: 4 }), unit(SOLD)], { canManage: false });
    expect(ops.map((op) => [op.key, op.count, op.disabled])).toEqual([
      ["print", 2, false],
      [`action-${QUARANTINE}`, 1, true],
      [`action-${RELEASE}`, 1, true],
      [`action-${SCRAP}`, 2, true],
      ["location", 2, true],
      ["return", 1, false],
    ]);
  });

  it("چاپِ دوباره و عودت از چند خرید", () => {
    expect(unitOperationsFor([unit(IN_STOCK, { printCount: 1 })], { canManage: true })[0].label).toBe("چاپ دوباره‌ی برچسب");
    const ret = unitOperationsFor([unit(QUARANTINED, { purchaseId: 1 }), unit(QUARANTINED, { purchaseId: 2 })], { canManage: true }).find((op) => op.key === "return");
    expect(ret).toMatchObject({ disabled: true, count: 2 });
    expect(ret.hint).toContain("چند خرید");
    const none = unitOperationsFor([unit(QUARANTINED)], { canManage: true }).find((op) => op.key === "return");
    expect(none.hint).toContain("تامین‌کننده‌ای ندارد");
    expect(purchaseReturnRouteOf(unit(QUARANTINED, { purchaseId: 9 }))).toBe(`${ROUTES.PURCHASES_RETURNS_NEW}?purchaseId=9&prefill=quarantine`);
    expect(purchaseReturnRouteOf(unit(IN_STOCK, { purchaseId: 9 }))).toBe(null);
  });
});

describe("کجاست؟", () => {
  it("هر وضعیت جای خودش", () => {
    expect(whereaboutsOf({ status: IN_STOCK, binLocation: "A1" })).toEqual({ place: "انبار", detail: "قفسه A1" });
    expect(whereaboutsOf({ status: IN_STOCK })).toEqual({ place: "انبار", detail: "قابل فروش" });
    expect(whereaboutsOf({ status: QUARANTINED, custodyReason: UnitCustodyReasonEnum.EXCESS, binLocation: "Q" }).detail).toContain("قفسه Q");
    expect(whereaboutsOf({ status: SOLD, customerName: "علی", saleId: 5 })).toMatchObject({ place: "نزد مشتری", detail: "علی" });
    expect(whereaboutsOf({ status: RETURNED_TO_SUPPLIER }).place).toBe("نزد تامین‌کننده");
    expect(whereaboutsOf({ status: SCRAPPED }).place).toBe("اسقاط‌شده");
    expect(whereaboutsOf({ status: 999 })).toEqual({ place: "—", detail: "" });
  });
});

describe("فیلترِ مؤثر", () => {
  it("«بدون برچسب» در جایگاهِ برچسب‌پذیر: statuses + labelState", () => {
    expect(effectiveUnitFilters({ segment: UNIT_SEGMENTS.ALL, labelFilter: LABEL_FILTERS.UNPRINTED, productId: 3 })).toEqual({
      productId: 3, custodyReason: "", status: "", statuses: [IN_STOCK, QUARANTINED], labelState: UnitLabelStateEnum.UNPRINTED,
    });
    expect(effectiveUnitFilters({ segment: UNIT_SEGMENTS.IN_STOCK, labelFilter: LABEL_FILTERS.UNPRINTED }).statuses).toEqual([IN_STOCK]);
  });

  it("جایگاهِ بی‌برچسب «بدون برچسب» را نادیده می‌گیرد؛ علتِ قرنطینه فقط در قرنطینه", () => {
    expect(effectiveUnitFilters({ segment: UNIT_SEGMENTS.WITH_CUSTOMER, labelFilter: LABEL_FILTERS.UNPRINTED, custodyReason: 2 })).toEqual({
      custodyReason: "", status: SOLD, statuses: [], labelState: "",
    });
    expect(effectiveUnitFilters({ segment: UNIT_SEGMENTS.QUARANTINE, labelFilter: LABEL_FILTERS.PRINTED, custodyReason: 2 })).toMatchObject({
      custodyReason: 2, status: QUARANTINED, labelState: UnitLabelStateEnum.PRINTED,
    });
    expect(segmentNeedsLabels(UNIT_SEGMENTS.SCRAPPED)).toBe(false);
    expect(Object.keys(UNIT_SEGMENT_META).sort()).toEqual(Object.values(UNIT_SEGMENTS).sort());
  });

  it("نشانی‌های قدیمی", () => {
    expect(segmentFromLegacyView("quarantine")).toEqual({ segment: UNIT_SEGMENTS.QUARANTINE });
    expect(segmentFromLegacyView("unlabeled")).toEqual({ segment: UNIT_SEGMENTS.ALL, labelFilter: "unprinted" });
    expect(segmentFromLegacyView("x")).toEqual({});
  });

  it("daysSince", () => {
    const now = new Date("2026-10-28T12:00:00Z").getTime();
    expect(daysSince("2026-10-25T12:00:00Z", now)).toBe(3);
    expect(daysSince("2026-11-01", now)).toBe(0);
    expect(daysSince("bad", now)).toBe(null);
    expect(daysSince(null, now)).toBe(null);
  });
});
