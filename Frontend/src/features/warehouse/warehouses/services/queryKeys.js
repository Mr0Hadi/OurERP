/**
 * کلیدهای کشِ انبارها و حواله‌ها: صفحه‌ی انبارها، انتخابگرِ انبار (`WarehouseSelect`) در دریافت/ارسال/انبارگردانی/
 * دانه‌ها و موجودیِ تفکیکیِ کالا همه زیرِ یک ریشه‌اند، تا هر نوشتن (انبار یا حواله، که شمارِ دانه‌ها را عوض می‌کند)
 * همه را تازه کند.
 */
export const warehouseKeys = {
  all: ["warehouses"],
  lists: () => [...warehouseKeys.all, "list"],
  list: (params) => [...warehouseKeys.lists(), params],
  productStock: (productId) => [...warehouseKeys.all, "productStock", productId],
  transfers: () => [...warehouseKeys.all, "transfers"],
  transferList: (params) => [...warehouseKeys.transfers(), "list", params],
  transferDetail: (id) => [...warehouseKeys.transfers(), "detail", String(id)],
};
