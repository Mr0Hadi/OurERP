import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { fetchVehicleProducts, fetchVehicles } from "./api-v1";
import { vehicleKeys } from "./queryKeys";

/**
 * فهرستِ خودروها — هم برای انتخابگرِ فرمِ کالا هم سایدبارِ صفحه‌ی خودروها.
 * خودروها کم‌اند، پس یک‌جا گرفته می‌شوند.
 */
export function useVehiclesQuery() {
  return useQuery({
    queryKey: vehicleKeys.lists(),
    queryFn: fetchVehicles,
  });
}

/** کالاهای یک خودرو؛ `vehicleId` تهی یعنی «همه‌ی خودروها». */
export function useVehicleProductsQuery({ vehicleId, search, page, take }) {
  return useQuery({
    queryKey: vehicleKeys.productList({ vehicleId, search, page, take }),
    queryFn: () => fetchVehicleProducts({ vehicleId, search, page, take }),
    placeholderData: keepPreviousData,
  });
}
