import { describe, expect, it } from "vitest";
import { StocktakeCountModeEnum, StocktakeStatusEnum } from "@/shared/domain/enums/stocktake";
import {
  LINE_FILTER,
  STOCKTAKE_SCOPE,
  acceptsManualCount,
  emptyStocktakeDraft,
  scanOutcome,
  scanOutcomeMessage,
  scopeSummary,
  stocktakeActions,
  stocktakeDraftErrors,
  toApiStocktake,
  visibleLines,
} from "./stocktake";

const draft = (patch) => ({ ...emptyStocktakeDraft(), title: "پاییز", ...patch });

describe("پیش‌نویسِ انبارگردانی", () => {
  it("عنوان و دامنه الزامی‌اند", () => {
    expect(stocktakeDraftErrors(emptyStocktakeDraft())).toEqual({
      title: "عنوانِ انبارگردانی را بنویسید",
      scope: "دسته یا برند را انتخاب کنید",
    });
    expect(stocktakeDraftErrors(draft({ brand: "بوش" }))).toEqual({});
    expect(stocktakeDraftErrors(draft({ scope: STOCKTAKE_SCOPE.BIN }))).toEqual({ scope: "قفسه را بنویسید" });
    expect(stocktakeDraftErrors(draft({ scope: STOCKTAKE_SCOPE.PRODUCTS }))).toEqual({ scope: "دست‌کم یک کالا انتخاب کنید" });
  });

  it("فقط فیلدهای دامنه‌ی انتخاب‌شده فرستاده می‌شوند", () => {
    // کاربر اول دسته را زده و بعد به «قفسه» رفته: دسته نباید برود.
    expect(toApiStocktake(draft({ scope: STOCKTAKE_SCOPE.BIN, productCategoryId: 4, binLocationPrefix: " A-1 " }))).toEqual({
      title: "پاییز",
      warehouseId: null,
      productCategoryId: null,
      brand: null,
      binLocationPrefix: "A-1",
      productIds: null,
      note: null,
    });
    expect(toApiStocktake(draft({ productCategoryId: "4", brand: "بوش" }))).toMatchObject({ productCategoryId: 4, brand: "بوش" });
    expect(toApiStocktake(draft({ scope: STOCKTAKE_SCOPE.PRODUCTS, products: [{ id: 3 }, { id: 9 }] })).productIds).toEqual([3, 9]);
  });
});

describe("کارهای مجاز", () => {
  const everyone = () => true;
  const counter = (name) => name === "StocktakeCount";

  it("شمارش با StocktakeCount، تأیید/بازگشایی/لغو با StocktakeApprove", () => {
    expect(stocktakeActions({ status: StocktakeStatusEnum.COUNTING }, counter)).toEqual({
      canCount: true, canSubmit: true, canReopen: false, canApprove: false, canCancel: false,
    });
    expect(stocktakeActions({ status: StocktakeStatusEnum.SUBMITTED }, everyone)).toEqual({
      canCount: false, canSubmit: false, canReopen: true, canApprove: true, canCancel: true,
    });
  });

  it("تأییدشده و لغوشده نهایی‌اند", () => {
    for (const status of [StocktakeStatusEnum.APPROVED, StocktakeStatusEnum.CANCELLED]) {
      expect(Object.values(stocktakeActions({ status }, everyone)).some(Boolean)).toBe(false);
    }
  });
});

describe("نتیجه‌ی اسکن", () => {
  const doc = (scanned, unknown = []) => ({ lines: scanned.map((scannedCount) => ({ scannedCount })), unknownBarcodes: unknown });

  it("ثبت‌شده، تکراری و ناشناخته از تفاوتِ سند پیش و پس", () => {
    const outcome = scanOutcome(doc([2, 0]), doc([3, 1], ["X"]), ["A", "B", "C", "X", "A"]);
    expect(outcome).toEqual({ added: 2, unknown: 1, repeated: 1 });
    expect(scanOutcomeMessage(outcome)).toEqual({ text: "۲ دانه ثبت شد، ۱ تکراری، ۱ بارکدِ ناشناخته", tone: "success" });
  });

  it("فقط تکراری ⇒ خطا", () => {
    expect(scanOutcomeMessage(scanOutcome(doc([1]), doc([1]), ["A"]))).toEqual({ text: "۱ تکراری", tone: "error" });
  });
});

describe("ردیف‌ها", () => {
  const lines = [
    { productName: "لنت ترمز", productCode: "100-1", countMode: StocktakeCountModeEnum.NONE, difference: null },
    { productName: "فیلتر روغن", productCode: "200-2", countMode: StocktakeCountModeEnum.SCAN, difference: -1 },
    { productName: "شمع", productCode: "300-3", countMode: StocktakeCountModeEnum.MANUAL, difference: 0, relocatedCount: 1 },
  ];

  it("جست‌وجو و فیلتر", () => {
    expect(visibleLines(lines, { search: "200" }).map((l) => l.productCode)).toEqual(["200-2"]);
    expect(visibleLines(lines, { filter: LINE_FILTER.UNCOUNTED }).map((l) => l.productCode)).toEqual(["100-1"]);
    expect(visibleLines(lines, { filter: LINE_FILTER.DIFFERENCE }).map((l) => l.productCode)).toEqual(["200-2", "300-3"]);
  });

  it("کالای اسکن‌شده عددِ دستی نمی‌پذیرد", () => {
    expect(lines.map(acceptsManualCount)).toEqual([true, false, true]);
  });
});

describe("دامنه در یک خط", () => {
  it("دسته، برند، قفسه یا کالاهای انتخابی", () => {
    expect(scopeSummary({ productCategoryId: 4, brand: "بوش" }, "لنت")).toBe("دسته‌ی لنت · برندِ بوش");
    expect(scopeSummary({ productCategoryId: 4 })).toBe("دسته‌ی #4");
    expect(scopeSummary({ binLocationPrefix: "A-1" })).toBe("قفسه‌ی A-1");
    expect(scopeSummary({})).toBe("کالاهای انتخابی");
  });
});
