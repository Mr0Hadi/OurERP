import { UnitCustodyReasonEnum } from "@/shared/domain/enums/unitStatus";
import { OFF_SCOPE_KINDS } from "./scopes";

/**
 * بریدنِ `PurchaseReceivingInfoDto` به گزارشِ انبار برای یک بخشِ فرمِ
 * مرجوعی خرید — خروجی مستقیم به `ReceivingReportLines` داده می‌شود.
 */

/**
 * سقفِ برداشت از قرنطینه برای یک تصمیمِ تازه روی این ادعا — همان عددی که
 * `AddClaimResolution` چک می‌کند.
 *
 *  - ادعای روی سفارش: `freeQuarantinedOnOrderQuantity` — قرنطینه‌ی
 *    پرداخت‌شده‌ی قلم (خرابِ دریافت، برگشتیِ معیوبِ مشتری، نگهداشتِ انبار)
 *    منهای آنچه تصمیم‌های مرجوعی‌های باز رزرو کرده‌اند.
 *  - مازاد و سفارش‌نداده: خودِ ادعا از لحظه‌ی ثبت مقدارش را رزرو کرده و
 *    تصمیم‌های زیرش از همان رزرو برمی‌دارند، پس سقف کلِ قرنطینه‌ی همان
 *    دسته است.
 *
 * `null` یعنی گزارشِ دریافت هنوز نیامده.
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
    : item?.freeQuarantinedOnOrderQuantity ?? 0;
}

/**
 * گزارشِ یک قلمِ سفارش: خرابیِ سهمِ سفارش و مازادِ همان قلم. هر ردیفِ
 * قرنطینه `kind` دارد تا بخشِ مازاد جدا شود (`withoutExcess`/`onlyExcess`).
 */
export function lineReceivingReport(receivingInfo, purchaseItemId) {
  const item = (receivingInfo?.items || []).find(
    (entry) => entry.purchaseItemId === purchaseItemId,
  );
  return {
    quarantined: [
      {
        kind: "excess",
        label: "در قرنطینه (مازاد)",
        quantity: item?.quarantinedExcessQuantity ?? 0,
      },
      {
        // خرابیِ دریافت، و از ۲۰۲۶-۰۹-۲۷ مازادِ خریده‌شده هم (که تا «بازگشت
        // به موجودی» در قرنطینه می‌ماند) — پس «خراب» همیشه درست نیست.
        kind: "onOrder",
        label: "در قرنطینه (سهم سفارش)",
        quantity: item?.quarantinedOnOrderQuantity ?? 0,
      },
      {
        kind: "customerReturn",
        label: "در قرنطینه (برگشتیِ معیوبِ مشتری)",
        quantity: item?.quarantinedCustomerReturnQuantity ?? 0,
      },
      {
        kind: "warehouseHold",
        label: "در قرنطینه (نگهداشتِ انبار)",
        quantity: item?.quarantinedWarehouseHoldQuantity ?? 0,
      },
    ],
    discrepancies: (receivingInfo?.discrepancies || []).filter(
      (d) => d.purchaseItemId === purchaseItemId,
    ),
  };
}

const isExcessDiscrepancy = (d) => d.custodyReason === UnitCustodyReasonEnum.EXCESS;

/** گزارشِ قلم بدونِ بخشِ مازادش — وقتی مازاد ادعای جدا و گزارشِ خودش را دارد. */
export function withoutExcess(report) {
  return {
    quarantined: report.quarantined.filter((entry) => entry.kind !== "excess"),
    discrepancies: report.discrepancies.filter((d) => !isExcessDiscrepancy(d)),
  };
}

/** فقط بخشِ مازادِ گزارشِ قلم. */
function onlyExcess(report) {
  return {
    quarantined: report.quarantined.filter((entry) => entry.kind === "excess"),
    discrepancies: report.discrepancies.filter(isExcessDiscrepancy),
  };
}

/**
 * گزارشِ مرتبط با یک ادعا: ادعای روی سفارش بخشِ سهمِ سفارشِ قلمش را
 * می‌بیند، مازاد فقط بخشِ مازادِ قلم، و نامرتبط فقط کالای سفارش‌ندادهِ
 * همان محصول.
 */
export function claimReceivingReport(receivingInfo, claim) {
  if (!receivingInfo || !claim) return { quarantined: [], discrepancies: [] };

  if (claim.offScopeKind === OFF_SCOPE_KINDS.UNLISTED) {
    const unlisted = (receivingInfo.unlistedItems || []).find(
      (entry) => entry.productId === claim.productId,
    );
    return {
      quarantined: [
        {
          kind: "unlisted",
          label: "در قرنطینه (سفارش‌نداده)",
          quantity: unlisted?.quarantinedQuantity ?? 0,
        },
      ],
      discrepancies: (receivingInfo.discrepancies || []).filter(
        (d) =>
          d.custodyReason === UnitCustodyReasonEnum.UNLISTED &&
          d.productId === claim.productId,
      ),
    };
  }

  const report = lineReceivingReport(receivingInfo, claim.orderLineId ?? null);
  return claim.offScopeKind === OFF_SCOPE_KINDS.EXCESS
    ? onlyExcess(report)
    : withoutExcess(report);
}

/** جمعِ همه‌ی دانه‌های قرنطینه‌ی یک خرید، از هر علتی. */
export function totalQuarantined(receivingInfo) {
  const items = (receivingInfo?.items || []).reduce(
    (sum, item) =>
      sum +
      (item.quarantinedOnOrderQuantity || 0) +
      (item.quarantinedCustomerReturnQuantity || 0) +
      (item.quarantinedWarehouseHoldQuantity || 0) +
      (item.quarantinedExcessQuantity || 0),
    0,
  );
  const unlisted = (receivingInfo?.unlistedItems || []).reduce(
    (sum, item) => sum + (item.quarantinedQuantity || 0),
    0,
  );
  return items + unlisted;
}
