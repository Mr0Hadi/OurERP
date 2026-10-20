import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { fetchSales, SALE_SORT_COLUMNS } from "@/features/sales/orders/services/api-v1";
import { saleKeys } from "@/features/sales/orders/services/queryKeys";
import { fetchProductUnits } from "@/features/warehouse/units/services/api-v1";
import { productUnitKeys } from "@/features/warehouse/units/services/queryKeys";
import { useDebouncedFilters } from "@/shared/hooks/useDebouncedFilters";
import { SaleProformaStageEnum } from "@/shared/domain/enums/saleProforma";
import { ProductUnitStatusEnum } from "@/shared/domain/enums/unitStatus";
import { listQuery } from "@/shared/services/api/contract";
import { useSaleCheckFilterStore } from "../store/saleCheckFilterStore";

export function useSaleCheckListFilters() {
  return useDebouncedFilters(useSaleCheckFilterStore, { text: [], instant: ["customerId"] });
}

/**
 * صفِ بررسیِ انبار = پیش‌فاکتورهای «تأیید مشتری» (`GetSaleList` با `proformaStages = 1`).
 * کلیدِ کش زیرِ فهرست‌های فروش است تا هر نوشتنِ فروش آن را هم باطل کند.
 */
export function useSaleCheckQueueQuery(filters, pagination, sorting) {
  const params = listQuery({
    filters: { ...filters, proformaStages: SaleProformaStageEnum.CUSTOMER_APPROVED },
    pagination,
    sorting,
    sortColumns: SALE_SORT_COLUMNS,
  });
  return useQuery({
    queryKey: saleKeys.list(params),
    queryFn: () => fetchSales(params),
    placeholderData: keepPreviousData,
    refetchOnMount: "always",
  });
}

/**
 * دانه‌های «در انبار»ِ یک کالا — برای گزارشِ دانه‌ی مفقود، که اسکن‌شدنی نیست و از فهرست
 * انتخاب می‌شود (بخش ۱۱ سند، `CheckSaleWarehouse.issues`).
 */
export function useInStockUnitsQuery(productId) {
  const params = {
    filters: { productId, status: ProductUnitStatusEnum.IN_STOCK },
    page: 1,
    take: 100,
  };
  return useQuery({
    queryKey: productUnitKeys.list(params),
    queryFn: () => fetchProductUnits(params),
    enabled: Boolean(productId),
  });
}
