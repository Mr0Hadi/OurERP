import { UnitCustodyReasonEnum } from "@/shared/domain/enums/unitStatus";
import { OFF_SCOPE_KINDS } from "./scopes";

/**
 * بریدنِ `PurchaseReceivingInfoDto` به گزارشِ انبار برای یک بخشِ فرمِ
 * مرجوعی خرید — خروجی مستقیم به `ReceivingReportLines` داده می‌شود.
 */

/**
 * چند عدد از کالای همین ادعا الان در قرنطینه است — همان دسته‌ای که سرور
 * برای آزادسازی و اسقاط از آن برمی‌دارد: ادعای روی سفارش خرابیِ سهمِ
 * سفارشِ قلمش، مازاد مازادِ همان قلم، و سفارش‌نداده همان کالا در همین
 * خرید. `null` یعنی گزارشِ دریافت هنوز نیامده.
 */
export function claimQuarantinedQuantity(receivingInfo, claim) {
  if (!receivingInfo || !claim) return null;

  if (claim.offScopeKind === OFF_SCOPE_KINDS.UNLISTED) {
    return (
      (receivingInfo.unlistedItems || []).find((entry) => entry.productId === claim.productId)
        ?.quarantinedQuantity ?? 0
    );
  }

  const item = (receivingInfo.items || []).find(
    (entry) => entry.purchaseItemId === (claim.orderLineId ?? null),
  );
  return claim.offScopeKind === OFF_SCOPE_KINDS.EXCESS
    ? item?.quarantinedExcessQuantity ?? 0
    : item?.quarantinedOnOrderQuantity ?? 0;
}

/** گزارشِ یک قلمِ سفارش: خرابیِ سهمِ سفارش و مازادِ همان قلم. */
export function lineReceivingReport(receivingInfo, purchaseItemId) {
  const item = (receivingInfo?.items || []).find(
    (entry) => entry.purchaseItemId === purchaseItemId,
  );
  return {
    quarantined: [
      { label: "در قرنطینه (خراب، سهم سفارش)", quantity: item?.quarantinedOnOrderQuantity ?? 0 },
      { label: "در قرنطینه (مازاد)", quantity: item?.quarantinedExcessQuantity ?? 0 },
    ],
    discrepancies: (receivingInfo?.discrepancies || []).filter(
      (d) => d.purchaseItemId === purchaseItemId,
    ),
  };
}

/**
 * گزارشِ مرتبط با یک ادعا. ادعای روی سفارش همه‌ی گزارشِ قلمش را می‌بیند؛
 * مازاد فقط بخشِ مازادِ قلم؛ نامرتبط فقط کالای سفارش‌ندادهِ همان محصول.
 */
export function claimReceivingReport(receivingInfo, claim) {
  if (!receivingInfo || !claim) return { quarantined: [], discrepancies: [] };

  if (claim.offScopeKind === OFF_SCOPE_KINDS.UNLISTED) {
    const unlisted = (receivingInfo.unlistedItems || []).find(
      (entry) => entry.productId === claim.productId,
    );
    return {
      quarantined: [
        { label: "در قرنطینه (سفارش‌نداده)", quantity: unlisted?.quarantinedQuantity ?? 0 },
      ],
      discrepancies: (receivingInfo.discrepancies || []).filter(
        (d) =>
          d.custodyReason === UnitCustodyReasonEnum.UNLISTED &&
          d.productId === claim.productId,
      ),
    };
  }

  const report = lineReceivingReport(receivingInfo, claim.orderLineId ?? null);
  if (claim.offScopeKind === OFF_SCOPE_KINDS.EXCESS) {
    return {
      quarantined: report.quarantined.slice(1),
      discrepancies: report.discrepancies.filter(
        (d) => d.custodyReason === UnitCustodyReasonEnum.EXCESS,
      ),
    };
  }
  return report;
}
