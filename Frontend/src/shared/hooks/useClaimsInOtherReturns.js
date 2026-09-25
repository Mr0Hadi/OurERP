import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { useRelatedPurchaseReturnsQuery } from "@/features/purchases/returns/services/queries";
import { useRelatedSalesReturnsQuery } from "@/features/sales/returns/services/queries";
import { fetchPurchaseReturnById } from "@/features/purchases/returns/services/api-v1";
import { fetchSalesReturnById } from "@/features/sales/returns/services/api-v1";
import { purchaseReturnKeys } from "@/features/purchases/returns/services/queryKeys";
import { salesReturnKeys } from "@/features/sales/returns/services/queryKeys";
import { RETURN_STATUSES } from "@/shared/domain/returns/statuses";
import { OFF_SCOPE_KINDS } from "@/shared/domain/returns/scopes";

/** کلیدِ یک خط برای جمعِ ادعاها: قلمِ سند، یا کالای سفارش‌نداده. */
export const claimLineKey = ({ orderLineId, offScopeKind, productId }) =>
  offScopeKind === OFF_SCOPE_KINDS.UNLISTED
    ? `p-${productId}`
    : `l-${orderLineId}`;

/**
 * ادعاهای مرجوعی‌های *دیگرِ* همین خرید/فروش، برای هر خط — تا کاربر ببیند
 * روی هر کالا قبلاً چقدر مرجوعی ثبت شده و دوبار اشتباهی ثبت نکند.
 *
 * مرجوعیِ ردشده یا لغوشده حساب نمی‌شود. فهرستِ مرجوعی‌ها ادعاها را ندارد،
 * پس جزئیاتِ هر مرجوعی جدا خوانده می‌شود (روی یک سند معمولاً چند تا بیشتر
 * نیست) و همان کشِ صفحه‌ی جزئیاتِ مرجوعی را پر می‌کند.
 *
 * @returns `Map<claimLineKey, { quantity, returnNumbers[] }>`
 */
export function useClaimsInOtherReturns(
  side,
  documentId,
  excludeReturnId = null,
) {
  const isPurchase = side === "purchase";
  const purchaseList = useRelatedPurchaseReturnsQuery(
    isPurchase ? documentId : null,
    excludeReturnId,
  );
  const salesList = useRelatedSalesReturnsQuery(
    isPurchase ? null : documentId,
    excludeReturnId,
  );
  const related = (isPurchase ? purchaseList.data : salesList.data) || [];
  const live = related.filter(
    (ret) =>
      ret.status !== RETURN_STATUSES.REJECTED &&
      ret.status !== RETURN_STATUSES.CANCELLED,
  );

  const details = useQueries({
    queries: live.map((ret) => ({
      queryKey: (isPurchase ? purchaseReturnKeys : salesReturnKeys).detail(
        ret.id,
      ),
      queryFn: () =>
        isPurchase
          ? fetchPurchaseReturnById(ret.id)
          : fetchSalesReturnById(ret.id),
    })),
  });

  const docs = details.map((query) => query.data).filter(Boolean);
  const signature = docs
    .map(
      (doc) =>
        `${doc.id}:${(doc.claims || []).map((c) => `${claimLineKey(c)}=${c.quantity}`).join(",")}`,
    )
    .join("|");

  return useMemo(() => {
    const byLine = new Map();
    docs.forEach((doc) => {
      (doc.claims || []).forEach((claim) => {
        const key = claimLineKey(claim);
        const entry = byLine.get(key) || { quantity: 0, returnNumbers: [] };
        entry.quantity += Number(claim.quantity) || 0;
        if (!entry.returnNumbers.includes(doc.returnNumber)) {
          entry.returnNumbers.push(doc.returnNumber);
        }
        byLine.set(key, entry);
      });
    });
    return byLine;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);
}
