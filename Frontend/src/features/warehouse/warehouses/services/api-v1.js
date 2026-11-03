import axiosInstance from "@/shared/services/api/axios";
import { idempotent, normalizeListResponse } from "@/shared/services/api/contract";

/**
 * `GET Warehouse/GetWarehouseList` — بی صفحه‌بندی، برای هر کاربرِ واردشده (انتخابگرها هم همین را می‌خوانند).
 * هر ردیف تعدادِ دانه‌های روی قفسه، قرنطینه، رزرو و «در راه به بیرون» را دارد. `includeInactive` غیرفعال‌ها را هم می‌آورد.
 */
export async function fetchWarehouses({ includeInactive = false } = {}) {
  const { data } = await axiosInstance.get("/Warehouse/GetWarehouseList", {
    params: { includeInactive: includeInactive || undefined },
  });
  return data ?? [];
}

/**
 * `GET Warehouse/GetProductWarehouseStock` — موجودیِ یک کالا به تفکیکِ انبار:
 * `[{ warehouseId, warehouseName, isDefault, inStock, quarantined, reserved, outgoingInTransit }]`.
 */
export async function fetchProductWarehouseStock(productId) {
  const { data } = await axiosInstance.get("/Warehouse/GetProductWarehouseStock", { params: { productId } });
  return data ?? [];
}

/** `POST CreateWarehouse` — `{ code, name, address, description, isDefault }`؛ کد یکتاست و بزرگ ذخیره می‌شود. */
export async function createWarehouse(body) {
  const { data } = await axiosInstance.post("/Warehouse/CreateWarehouse", body);
  return data;
}

/** `PUT UpdateWarehouse` — همان بدنه با `id`. پیش‌فرض را فقط با پیش‌فرض کردنِ انبارِ دیگری می‌شود برداشت. */
export async function updateWarehouse(body) {
  const { data } = await axiosInstance.put("/Warehouse/UpdateWarehouse", body);
  return data;
}

/** `DELETE DeleteWarehouse` — غیرفعال‌سازی؛ برای انبارِ پیش‌فرض، انبارِ دارای دانه یا انبارگردانیِ باز ۴۰۰. */
export async function deactivateWarehouse(id) {
  const { data } = await axiosInstance.delete("/Warehouse/DeleteWarehouse", { params: { id } });
  return data;
}

/**
 * حواله دانه‌ها را یکی‌یکی جابه‌جا می‌کند و روی سرورِ کند از ۱۵ ثانیه‌ی پیش‌فرض می‌گذرد؛ کلیدِ ایدمپوتنسی تکرار را
 * بی‌خطر می‌کند، ولی بهتر است پاسخ همان بار برسد.
 */
const SLOW = { timeout: 60000 };

/** `StockTransferListSortEnum` — پیش‌فرضِ سرور تاریخِ ارسال، نزولی. */
export const STOCK_TRANSFER_SORT_COLUMNS = { dispatchedAt: 0, transferNumber: 1, status: 2 };

/** `GET GetStockTransferList` — صفحه‌ای؛ ردیف‌ها بی `products`. */
export async function fetchStockTransfers(params) {
  const { data } = await axiosInstance.get("/Warehouse/GetStockTransferList", { params });
  return normalizeListResponse(data, { itemsKey: "stockTransferList" });
}

/** `GET GetStockTransferDetail` — همان شکلِ پاسخِ سه دستورِ حواله. */
export async function fetchStockTransfer(id) {
  const { data } = await axiosInstance.get("/Warehouse/GetStockTransferDetail", { params: { id } });
  return data;
}

/**
 * `POST CreateStockTransfer` — `{ fromWarehouseId, toWarehouseId, description, lines: [{ productId, quantity,
 * productUnitBarcodes }] }`. فقط با چندانبارِ روشن. بی بارکد قدیمی‌ترین دانه‌های قفسه‌ی مبدأ برداشته می‌شوند.
 */
export async function createStockTransfer(body, { idempotencyKey } = {}) {
  const { data } = await axiosInstance.post("/Warehouse/CreateStockTransfer", body, {
    ...idempotent(idempotencyKey),
    ...SLOW,
  });
  return data;
}

/** `POST ReceiveStockTransfer` / `CancelStockTransfer` — فقط حواله‌ی «در راه»، مستقل از سوییچ. */
export async function changeStockTransferStatus(action, id) {
  const { data } = await axiosInstance.post(`/Warehouse/${action}`, { id }, SLOW);
  return data;
}
