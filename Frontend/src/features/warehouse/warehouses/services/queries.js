import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { listQuery } from "@/shared/services/api/contract";
import {
  STOCK_TRANSFER_SORT_COLUMNS,
  fetchProductWarehouseStock,
  fetchStockTransfer,
  fetchStockTransfers,
  fetchWarehouses,
} from "./api-v1";
import { warehouseKeys } from "./queryKeys";

/** انبارها کم و کم‌تغییرند؛ هر انتخابگر درخواستِ تازه نمی‌زند و نوشتن در صفحه‌ی انبارها باطلشان می‌کند. */
export function useWarehousesQuery({ includeInactive = false, enabled = true } = {}) {
  return useQuery({
    queryKey: warehouseKeys.list({ includeInactive }),
    queryFn: () => fetchWarehouses({ includeInactive }),
    staleTime: 60 * 1000,
    enabled,
  });
}

/** موجودیِ تفکیکیِ یک کالا در انبارها. */
export function useProductWarehouseStockQuery(productId, { enabled = true } = {}) {
  return useQuery({
    queryKey: warehouseKeys.productStock(productId),
    queryFn: () => fetchProductWarehouseStock(productId),
    enabled: enabled && productId != null,
  });
}

/** حواله‌ها، صفحه‌ای؛ فیلترها با نام‌های `GetStockTransferListQuery`. */
export function useStockTransfersQuery(filters, pagination, sorting) {
  const params = listQuery({ filters, pagination, sorting, sortColumns: STOCK_TRANSFER_SORT_COLUMNS });
  return useQuery({
    queryKey: warehouseKeys.transferList(params),
    queryFn: () => fetchStockTransfers(params),
    placeholderData: keepPreviousData,
  });
}

/** یک حواله با کالاها و بارکدها. */
export function useStockTransferQuery(id) {
  return useQuery({
    queryKey: warehouseKeys.transferDetail(id),
    queryFn: () => fetchStockTransfer(id),
    enabled: id != null,
  });
}
