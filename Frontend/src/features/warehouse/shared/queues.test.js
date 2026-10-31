import { describe, expect, it, vi } from "vitest";
import { PurchaseStatusEnum } from "@/shared/domain/enums/purchaseStatus";
import { SaleStatusEnum } from "@/shared/domain/enums/saleStatus";
import { QUEUE_FILTER, needsDocumentList, parseQueueFilter } from "./queueFilters";
import { trackedLookup, withProductInfo } from "./productInfo";
import { applyShipmentResult } from "./shipmentCache";
import { RECEIVING_STATUS_OPTIONS, receivingStatusesOf } from "../receiving/domain/receivingVocabulary";
import { SHIPPING_STATUS_OPTIONS, isExcessAllowedFor, shippingStatusesOf } from "../shipping/domain/shippingVocabulary";
import { getRowStatus as receivingRow } from "../receiving/components/forms/receivingRowStatus";
import { getRowStatus as shippingRow, ROW_STATUS_CONFIG as SHIPPING_CONFIG } from "../shipping/components/forms/shippingRowStatus";

describe("فیلترِ صف", () => {
  it("حالت‌های مرجوعی رشته می‌مانند، وضعیت عدد می‌شود", () => {
    expect(parseQueueFilter("returns")).toBe(QUEUE_FILTER.RETURNS);
    expect(parseQueueFilter("3")).toBe(3);
    expect([QUEUE_FILTER.AWAITING, QUEUE_FILTER.RETURNS, QUEUE_FILTER.REPLACEMENTS, 2].map(needsDocumentList)).toEqual([true, false, false, true]);
  });

  it("وضعیت‌های سرور فقط برای فیلترهایی که فهرستِ سند می‌خواهند", () => {
    expect(receivingStatusesOf(QUEUE_FILTER.AWAITING)).toEqual([PurchaseStatusEnum.SHIPPED, PurchaseStatusEnum.PARTIALLY_RECEIVED]);
    expect(receivingStatusesOf("")).toEqual(receivingStatusesOf(null));
    expect(receivingStatusesOf(String(PurchaseStatusEnum.RECEIVED))).toEqual([PurchaseStatusEnum.RECEIVED]);
    expect(shippingStatusesOf(QUEUE_FILTER.AWAITING)).toEqual([SaleStatusEnum.PROCESSING, SaleStatusEnum.PARTIALLY_DELIVERED]);
    // RETURNS/REPLACEMENTS به [NaN] می‌رسند؛ query با `enabled: needsDocumentList` اصلاً اجرا نمی‌شود.
    for (const options of [RECEIVING_STATUS_OPTIONS, SHIPPING_STATUS_OPTIONS]) {
      const values = options.map((option) => option.value);
      expect(new Set(values).size).toBe(values.length);
      expect(values).toEqual(expect.arrayContaining([QUEUE_FILTER.AWAITING, QUEUE_FILTER.RETURNS, QUEUE_FILTER.REPLACEMENTS]));
      expect(options.every((option) => option.label)).toBe(true);
    }
  });

  it("مازاد فقط روی فروشی که چیزی ارسال شده", () => {
    expect([SaleStatusEnum.PROCESSING, SaleStatusEnum.SHIPPED, String(SaleStatusEnum.DELIVERED)].map(isExcessAllowedFor)).toEqual([false, true, true]);
  });
});

describe("ردیف‌های دریافت/ارسال", () => {
  it("سه حالت با نامِ خودِ هر صفحه", () => {
    expect([receivingRow(3, 0), receivingRow(3, 1), receivingRow(3, 3)]).toEqual(["missing", "partial", "complete"]);
    expect(shippingRow(2, 0)).not.toBe("missing");
    expect(Object.keys(SHIPPING_CONFIG)).toContain(shippingRow(2, 0));
  });

  it("اطلاعاتِ کالا از نقشه، با شناسه‌ی رشته‌ای هم", () => {
    const map = new Map([[7, { imageKey: "k", brand: "ایساکو", requiresUnitTracking: true }]]);
    expect(withProductInfo([{ productId: "7" }, { productId: 8 }], map)).toEqual([
      { productId: "7", imageKey: "k", imageUrl: null, brand: "ایساکو" },
      { productId: 8, imageKey: null, imageUrl: null, brand: "" },
    ]);
    expect([trackedLookup(map)("7"), trackedLookup(map)(8)]).toEqual([true, false]);
  });
});

describe("applyShipmentResult", () => {
  it("مرجوعی‌های تازه در کش، و خرید/فروش باطل", () => {
    const queryClient = { setQueryData: vi.fn(), invalidateQueries: vi.fn(), removeQueries: vi.fn(), refetchQueries: vi.fn() };
    applyShipmentResult(queryClient, {
      purchaseReturns: [{ id: 11, purchaseId: 3, claims: [] }],
      saleReturns: [],
      sale: { saleId: 5 },
    }, {});
    expect(queryClient.setQueryData).toHaveBeenCalledTimes(1);
    expect(queryClient.setQueryData.mock.calls[0][1]).toMatchObject({ id: 11, purchaseId: 3 });
    expect(queryClient.invalidateQueries).toHaveBeenCalled();
  });
});
