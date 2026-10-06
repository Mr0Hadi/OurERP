import {
  SALE_RETURN_SORT_COLUMNS,
  fetchSalesReturns,
  fetchSalesReturnById,
  fetchReturnableSales,
  fetchSaleForReturn,
} from "./api-v1";
import { salesReturnKeys } from "./queryKeys";
import { useSalesReturnFilterStore } from "../store/salesReturnFilterStore";
import { createReturnQueries } from "@/shared/services/returns/createReturnQueries";

/** کوئری‌های مرجوعیِ فروش (`createReturnQueries`). */
const queries = createReturnQueries({
  api: {
    list: fetchSalesReturns,
    detail: fetchSalesReturnById,
    returnable: fetchReturnableSales,
    // `GetSaleDetail`: اقلام با ارسال‌شده/تسویه‌شده و سقف‌های ادعا.
    source: fetchSaleForReturn,
  },
  keys: {
    list: salesReturnKeys.list,
    detail: salesReturnKeys.detail,
    returnable: salesReturnKeys.returnableSalesSearch,
    source: salesReturnKeys.saleForReturn,
  },
  filterStore: useSalesReturnFilterStore,
  partyFilter: "customerId",
  sortColumns: SALE_RETURN_SORT_COLUMNS,
  documentParam: "saleId",
});

export const useSalesReturnListFilters = queries.useListFilters;
export const useSalesReturnsQuery = queries.useList;
export const useSalesReturnQuery = queries.useDetail;
export const useReturnableSalesQuery = queries.useReturnable;
export const useSaleForReturnQuery = queries.useSource;
export const useRelatedSalesReturnsQuery = queries.useRelated;
