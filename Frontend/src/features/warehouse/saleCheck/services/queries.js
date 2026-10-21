import { useQuery } from "@tanstack/react-query";

import { useProformaQueueQuery } from "@/features/sales/orders/services/queries";
import { fetchProductUnits } from "@/features/warehouse/units/services/api-v1";
import { productUnitKeys } from "@/features/warehouse/units/services/queryKeys";
import { useDebouncedFilters } from "@/shared/hooks/useDebouncedFilters";
import { SaleProformaStageEnum } from "@/shared/domain/enums/saleProforma";
import { ProductUnitStatusEnum } from "@/shared/domain/enums/unitStatus";
import { useSaleCheckFilterStore } from "../store/saleCheckFilterStore";

export function useSaleCheckListFilters() {
  return useDebouncedFilters(useSaleCheckFilterStore, { text: [], instant: ["customerId"] });
}

/** صفِ بررسیِ انبار = پیش‌فاکتورهای «تأیید مشتری». */
export function useSaleCheckQueueQuery(filters, pagination, sorting) {
  return useProformaQueueQuery(SaleProformaStageEnum.CUSTOMER_APPROVED, filters, pagination, sorting);
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
