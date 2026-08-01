// src/features/sales/domain/salesReturnRules.js
import { SALES_RETURN_STATUSES } from "../services/returns/mockData";

function hasAnyPhysicalInspection(salesReturn) {
  return (salesReturn?.items || []).some((i) => (i.verifiedQty || 0) > 0);
}

export function canDeleteSalesReturn(salesReturn) {
  if (!salesReturn) return false;
  return (
    salesReturn.status === SALES_RETURN_STATUSES.PENDING_INSPECTION &&
    !hasAnyPhysicalInspection(salesReturn)
  );
}

export function canCancelSalesReturn(salesReturn) {
  if (!salesReturn) return false;
  return (
    salesReturn.status === SALES_RETURN_STATUSES.PENDING_INSPECTION &&
    !hasAnyPhysicalInspection(salesReturn)
  );
}

export function canRejectSalesReturn(salesReturn) {
  if (!salesReturn) return false;
  return (
    salesReturn.status === SALES_RETURN_STATUSES.PENDING_INSPECTION &&
    !hasAnyPhysicalInspection(salesReturn)
  );
}