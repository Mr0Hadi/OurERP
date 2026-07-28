// src/features/purchases/domain/purchaseReturnRules.js
import { PURCHASE_RETURN_STATUSES } from "../services/returns/mockData";

/**
 * حذف کامل مرجوعی فقط تا زمانی که هنوز هیچ هماهنگی‌ای با تامین‌کننده
 * شروع نشده (وضعیت pending) مجاز است. پس از آن فقط می‌توان لغو کرد.
 */
export function canDeletePurchaseReturn(purchaseReturn) {
  if (!purchaseReturn) return false;
  return purchaseReturn.status === PURCHASE_RETURN_STATUSES.PENDING;
}

/**
 * لغو مرجوعی در هر وضعیت غیرنهایی مجاز است
 */
export function canCancelPurchaseReturn(purchaseReturn) {
  if (!purchaseReturn) return false;
  const finalStatuses = [
    PURCHASE_RETURN_STATUSES.RESOLVED,
    PURCHASE_RETURN_STATUSES.CANCELLED,
  ];
  return !finalStatuses.includes(purchaseReturn.status);
}