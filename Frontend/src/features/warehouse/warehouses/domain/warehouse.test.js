import { describe, expect, it } from "vitest";
import {
  deactivateBlocker,
  emptyTransferDraft,
  emptyWarehouseDraft,
  toApiTransfer,
  toApiWarehouse,
  transferDraftErrors,
  warehouseDraftErrors,
  withWarehouse,
} from "./warehouse";

const counts = { inStockUnits: 0, quarantinedUnits: 0, reservedUnits: 0, outgoingInTransitUnits: 0 };

describe("warehouse form", () => {
  it("requires code and name", () => {
    expect(warehouseDraftErrors(emptyWarehouseDraft())).toEqual({ code: expect.any(String), name: expect.any(String) });
  });

  it("upper-cases the code and blanks empty fields", () => {
    expect(toApiWarehouse({ ...emptyWarehouseDraft(), code: " b2 ", name: "شعبه" }, 3)).toEqual({
      id: 3,
      code: "B2",
      name: "شعبه",
      address: null,
      description: null,
      isDefault: false,
    });
  });
});

describe("deactivateBlocker", () => {
  it("blocks the default warehouse and one holding units", () => {
    expect(deactivateBlocker({ ...counts, isDefault: true })).toMatch(/پیش‌فرض/);
    expect(deactivateBlocker({ ...counts, reservedUnits: 1 })).toMatch(/دانه/);
    expect(deactivateBlocker({ ...counts })).toBeNull();
  });
});

describe("transfer form", () => {
  const line = { productId: 5, name: "لنت", quantity: 2, barcodes: [] };

  it("needs two different warehouses and a line", () => {
    const errors = transferDraftErrors({ ...emptyTransferDraft(), fromWarehouseId: 1, toWarehouseId: 1 });
    expect(errors.toWarehouseId).toMatch(/یکی/);
    expect(errors.lines).toBeDefined();
  });

  it("accepts barcodes only when they match the quantity", () => {
    const draft = { ...emptyTransferDraft(), fromWarehouseId: 1, toWarehouseId: 2, lines: [{ ...line, barcodes: ["A"] }] };
    expect(transferDraftErrors(draft).lines).toMatch(/بارکد/);
    expect(transferDraftErrors({ ...draft, lines: [line] })).toEqual({});
  });

  it("sends null barcodes when none were scanned", () => {
    const draft = { ...emptyTransferDraft(), fromWarehouseId: 1, toWarehouseId: 2, lines: [line] };
    expect(toApiTransfer(draft).lines).toEqual([{ productId: 5, quantity: 2, productUnitBarcodes: null }]);
  });
});

describe("withWarehouse", () => {
  it("stamps the document and every round", () => {
    const shipment = { purchase: { purchaseId: 1 }, purchaseReturnRounds: [{ purchaseReturnId: 2 }], saleReturnRounds: [] };
    expect(withWarehouse(shipment, 4)).toEqual({
      purchase: { purchaseId: 1, warehouseId: 4 },
      purchaseReturnRounds: [{ purchaseReturnId: 2, warehouseId: 4 }],
      saleReturnRounds: [],
    });
  });

  it("leaves a null document and a null warehouse alone", () => {
    const shipment = { sale: null, saleReturnRounds: [{ saleReturnId: 1 }] };
    expect(withWarehouse(shipment, 4).sale).toBeNull();
    expect(withWarehouse(shipment, null)).toBe(shipment);
  });
});
