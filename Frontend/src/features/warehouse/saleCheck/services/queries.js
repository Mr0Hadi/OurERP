import { useQuery } from "@tanstack/react-query";

import { fetchProductUnits } from "@/features/warehouse/units/services/api-v1";
import { productUnitKeys } from "@/features/warehouse/units/services/queryKeys";
import { ProductUnitStatusEnum } from "@/shared/domain/enums/unitStatus";

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
