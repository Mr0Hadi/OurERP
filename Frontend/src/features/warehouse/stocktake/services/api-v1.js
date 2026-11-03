import axiosInstance from "@/shared/services/api/axios";
import { idempotent, normalizeListResponse } from "@/shared/services/api/contract";

/**
 * انبارگردانی — کنترلرِ `api/Stocktake` (`api-guide.fa.md` بخش ۲۶).
 *
 * ساخت از قفسه عکسِ فوری می‌گیرد؛ فروش و دریافت متوقف نمی‌شود چون مقایسه با همان عکس است. همه‌ی دستورها
 * سندِ کامل (`StocktakeDto` با `lines`) برمی‌گردانند، پس پاسخ مستقیم در کشِ جزئیات می‌نشیند.
 */

/** `StocktakeListSortEnum`، بر اساسِ شناسه‌ی ستونِ جدول. */
export const STOCKTAKE_SORT_COLUMNS = {
  createdAt: 0,
  number: 1,
  status: 2,
};

/** `GET GetStocktakeList` — `statuses`، `warehouseId`، `fromDate`/`toDate` (تاریخِ ساخت)، `search` (شماره یا عنوان). ردیف‌ها بی `lines`. */
export async function fetchStocktakes(params) {
  const { data } = await axiosInstance.get("/Stocktake/GetStocktakeList", { params });
  return normalizeListResponse(data, { itemsKey: "stocktakeList" });
}

export async function fetchStocktake(id) {
  const { data } = await axiosInstance.get("/Stocktake/GetStocktakeDetail", { params: { id } });
  return data;
}

/** `POST CreateStocktake` — دامنه: `productIds`، یا دسته و/یا برند، یا `binLocationPrefix`. دامنه‌ی خالی ۴۰۰. */
export async function createStocktake(body, { idempotencyKey } = {}) {
  const { data } = await axiosInstance.post("/Stocktake/CreateStocktake", body, idempotent(idempotencyKey));
  return data;
}

/** `POST ScanStocktakeUnits` — دسته‌ای از اسکنر؛ اسکنِ تکراری بی‌اثر، بارکدِ ناشناخته در `unknownBarcodes`. */
export async function scanStocktakeUnits({ stocktakeId, barcodes }) {
  const { data } = await axiosInstance.post("/Stocktake/ScanStocktakeUnits", { stocktakeId, barcodes });
  return data;
}

export async function removeStocktakeScan({ stocktakeId, barcode }) {
  const { data } = await axiosInstance.post("/Stocktake/RemoveStocktakeScan", { stocktakeId, barcode });
  return data;
}

/** `POST CountStocktakeLine` — شمارشِ دستی؛ `quantity: null` پاکش می‌کند. وقتی کالا اسکن دارد نادیده گرفته می‌شود. */
export async function countStocktakeLine({ stocktakeId, productId, quantity }) {
  const { data } = await axiosInstance.post("/Stocktake/CountStocktakeLine", { stocktakeId, productId, quantity });
  return data;
}

/**
 * گذارِ وضعیت: `SubmitStocktake` (پایانِ شمارش)، `ReopenStocktake`، `ApproveStocktake` (اعمالِ مغایرت)، `CancelStocktake`.
 * همه `{ id }`.
 */
export async function changeStocktakeStatus(action, id, { idempotencyKey } = {}) {
  const { data } = await axiosInstance.post(`/Stocktake/${action}`, { id }, idempotent(idempotencyKey));
  return data;
}
