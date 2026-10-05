import { invalidatePurchaseEcosystem } from "@/features/purchases/orders/services/sharedInvalidation";
import { invalidateSalesEcosystem } from "@/features/sales/orders/services/sharedInvalidation";
import { purchaseReturnKeys } from "@/features/purchases/returns/services/queryKeys";
import { salesReturnKeys } from "@/features/sales/returns/services/queryKeys";
import { fromApiPurchaseReturn, fromApiSaleReturn } from "@/shared/domain/returns/claimsApi";

/**
 * پاسخِ یک محموله (`ReceiveShipment`/`DispatchShipment`) در کش: سندهای مرجوعیِ
 * برگشتی مستقیم می‌نشینند و اکوسیستمِ خرید و فروشِ مربوط باطل می‌شود. خودِ
 * خرید/فروش سندِ کامل برنمی‌گردد و فقط باطل می‌شود.
 *
 * @param result  `{ purchase?, sale?, purchaseReturns?, saleReturns? }`
 * @param command همان بدنه‌ی فرستاده‌شده (برای شناسه‌ی خرید/فروش)
 */
export function applyShipmentResult(queryClient, result, command) {
  (result?.purchaseReturns || []).forEach((doc) => {
    const updated = fromApiPurchaseReturn(doc);
    queryClient.setQueryData(purchaseReturnKeys.detail(updated.id), updated);
    invalidatePurchaseEcosystem(queryClient, updated.purchaseId, { freshReturnId: updated.id });
  });
  (result?.saleReturns || []).forEach((doc) => {
    const updated = fromApiSaleReturn(doc);
    queryClient.setQueryData(salesReturnKeys.detail(updated.id), updated);
    invalidateSalesEcosystem(queryClient, updated.saleId, { freshReturnId: updated.id });
  });

  const purchaseId = result?.purchase?.purchaseId ?? command?.purchase?.purchaseId;
  if (purchaseId != null) invalidatePurchaseEcosystem(queryClient, purchaseId);
  const saleId = result?.sale?.saleId ?? command?.sale?.saleId;
  if (saleId != null) invalidateSalesEcosystem(queryClient, saleId);
}
