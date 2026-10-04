import {
  PURCHASE_RETURN_SORT_COLUMNS,
  fetchPurchaseReturns,
  fetchPurchaseReturnById,
  fetchReturnablePurchases,
  fetchPurchaseForReturn,
} from "./api-v1";
import { purchaseReturnKeys } from "./queryKeys";
import { usePurchaseReturnFilterStore } from "../store/purchaseReturnFilterStore";
import { createReturnQueries } from "@/shared/services/returns/createReturnQueries";

/** کوئری‌های مرجوعیِ خرید (`createReturnQueries`). */
const queries = createReturnQueries({
  api: {
    list: fetchPurchaseReturns,
    detail: fetchPurchaseReturnById,
    returnable: fetchReturnablePurchases,
    // `GetPurchaseReceivingInfo`: اقلام با رسیده/قرنطینه/سقفِ ادعا، و گزارشِ دریافت.
    source: fetchPurchaseForReturn,
  },
  keys: {
    list: purchaseReturnKeys.list,
    detail: purchaseReturnKeys.detail,
    returnable: purchaseReturnKeys.returnablePurchasesSearch,
    source: purchaseReturnKeys.purchaseForReturn,
  },
  filterStore: usePurchaseReturnFilterStore,
  partyFilter: "supplierId",
  sortColumns: PURCHASE_RETURN_SORT_COLUMNS,
  documentParam: "purchaseId",
});

export const usePurchaseReturnListFilters = queries.useListFilters;
export const usePurchaseReturnsQuery = queries.useList;
export const usePurchaseReturnQuery = queries.useDetail;
export const useReturnablePurchasesQuery = queries.useReturnable;
export const usePurchaseForReturnQuery = queries.useSource;
export const useRelatedPurchaseReturnsQuery = queries.useRelated;
