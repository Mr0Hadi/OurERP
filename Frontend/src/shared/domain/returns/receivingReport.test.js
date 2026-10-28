import { describe, expect, it } from "vitest";
import { UnitCustodyReasonEnum } from "@/shared/domain/enums/unitStatus";
import { OFF_SCOPE_KINDS } from "./scopes";
import { claimQuarantinedQuantity, claimReceivingReport, totalQuarantined } from "./receivingReport";

const info = {
  items: [{
    purchaseItemId: 7,
    quarantinedOnOrderQuantity: 2,
    freeQuarantinedOnOrderQuantity: 1,
    quarantinedCustomerReturnQuantity: 1,
    quarantinedWarehouseHoldQuantity: 0,
    quarantinedExcessQuantity: 3,
  }],
  unlistedItems: [{ productId: 50, quarantinedQuantity: 4 }],
  discrepancies: [
    { purchaseItemId: 7, custodyReason: UnitCustodyReasonEnum.ON_ORDER },
    { purchaseItemId: 7, custodyReason: UnitCustodyReasonEnum.EXCESS },
    { purchaseItemId: null, productId: 50, custodyReason: UnitCustodyReasonEnum.UNLISTED },
  ],
};

describe("claimQuarantinedQuantity — سقفِ AddClaimResolution", () => {
  it("روی سفارش: قرنطینه‌ی آزاد؛ مازاد و سفارش‌نداده: کلِ دسته", () => {
    expect(claimQuarantinedQuantity(info, { orderLineId: 7, offScopeKind: null })).toBe(1);
    expect(claimQuarantinedQuantity(info, { orderLineId: 7, offScopeKind: OFF_SCOPE_KINDS.EXCESS })).toBe(3);
    expect(claimQuarantinedQuantity(info, { productId: 50, offScopeKind: OFF_SCOPE_KINDS.UNLISTED })).toBe(4);
    expect(claimQuarantinedQuantity(info, { orderLineId: 99 })).toBe(0);
    expect(claimQuarantinedQuantity(null, { orderLineId: 7 })).toBe(null);
  });
});

describe("claimReceivingReport", () => {
  it("روی سفارش بی بخشِ مازاد، مازاد فقط مازاد، سفارش‌نداده فقط همان کالا", () => {
    const onOrder = claimReceivingReport(info, { orderLineId: 7 });
    expect(onOrder.quarantined.map((q) => q.kind)).toEqual(["onOrder", "customerReturn", "warehouseHold"]);
    expect(onOrder.discrepancies).toHaveLength(1);

    const excess = claimReceivingReport(info, { orderLineId: 7, offScopeKind: OFF_SCOPE_KINDS.EXCESS });
    expect(excess.quarantined).toEqual([{ kind: "excess", label: "در قرنطینه (مازاد)", quantity: 3 }]);
    expect(excess.discrepancies.map((d) => d.custodyReason)).toEqual([UnitCustodyReasonEnum.EXCESS]);

    const unlisted = claimReceivingReport(info, { productId: 50, offScopeKind: OFF_SCOPE_KINDS.UNLISTED });
    expect(unlisted.quarantined[0].quantity).toBe(4);
    expect(unlisted.discrepancies).toHaveLength(1);
  });

  it("همه‌ی قرنطینه از هر علتی", () => {
    expect(totalQuarantined(info)).toBe(2 + 1 + 0 + 3 + 4);
    expect(totalQuarantined(null)).toBe(0);
  });
});
