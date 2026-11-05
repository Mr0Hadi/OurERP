import axiosInstance from "@/shared/services/api/axios";
import { idempotent, normalizeListResponse } from "@/shared/services/api/contract";

/**
 * انبارگردانی — کنترلرِ `api/Stocktake` (`api-guide.fa.md` بخش ۲۶).
 *
 * ساخت موجودیِ سیستمِ همان لحظه (`snapshotAt`) را مبنا ثبت می‌کند؛ فروش و دریافت متوقف نمی‌شود چون مقایسه با همان مبناست. همه‌ی دستورها
 * سندِ کامل (`StocktakeDto` با `lines`) برمی‌گردانند، پس پاسخ مستقیم در کشِ جزئیات می‌نشیند.
 *
 * سرورِ تست گاهی چند ده ثانیه مکث می‌کند و با سقفِ ۱۵ ثانیه‌ایِ پیش‌فرض درخواستی که روی سرور انجام شده در مرورگر
 * خطای «بیش از حد طول کشید» می‌گرفت؛ همه‌ی درخواست‌های این‌جا سقفِ بلندتری دارند (مثلِ ورود/خروجِ فایل).
 */
const TIMEOUT = { timeout: 60000 };

/** `StocktakeListSortEnum`، بر اساسِ شناسه‌ی ستونِ جدول. */
export const STOCKTAKE_SORT_COLUMNS = {
  createdAt: 0,
  number: 1,
  status: 2,
};

/** `GET GetStocktakeList` — `statuses`، `warehouseId`، `fromDate`/`toDate` (تاریخِ ساخت)، `search` (شماره یا عنوان). ردیف‌ها بی `lines`. */
export async function fetchStocktakes(params) {
  const { data } = await axiosInstance.get("/Stocktake/GetStocktakeList", { params, ...TIMEOUT });
  return normalizeListResponse(data, { itemsKey: "stocktakeList" });
}

export async function fetchStocktake(id) {
  const { data } = await axiosInstance.get("/Stocktake/GetStocktakeDetail", { params: { id }, ...TIMEOUT });
  return data;
}

/** `POST CreateStocktake` — دامنه: `productIds`، یا دسته و/یا برند، یا `binLocationPrefix`. دامنه‌ی خالی ۴۰۰. */
export async function createStocktake(body, { idempotencyKey } = {}) {
  const { data } = await axiosInstance.post("/Stocktake/CreateStocktake", body, { ...TIMEOUT, ...idempotent(idempotencyKey) });
  return data;
}

/** `POST ScanStocktakeUnits` — دسته‌ای از اسکنر؛ اسکنِ تکراری بی‌اثر، بارکدِ ناشناخته در `unknownBarcodes`. */
export async function scanStocktakeUnits({ stocktakeId, barcodes }) {
  const { data } = await axiosInstance.post("/Stocktake/ScanStocktakeUnits", { stocktakeId, barcodes }, TIMEOUT);
  return data;
}

export async function removeStocktakeScan({ stocktakeId, barcode }) {
  const { data } = await axiosInstance.post("/Stocktake/RemoveStocktakeScan", { stocktakeId, barcode }, TIMEOUT);
  return data;
}

/** `POST CountStocktakeLine` — شمارشِ دستی؛ `quantity: null` پاکش می‌کند. وقتی کالا اسکن دارد نادیده گرفته می‌شود. */
export async function countStocktakeLine({ stocktakeId, productId, quantity }) {
  const { data } = await axiosInstance.post("/Stocktake/CountStocktakeLine", { stocktakeId, productId, quantity }, TIMEOUT);
  return data;
}

/**
 * `POST CountStocktakeLines` — چند شمارشِ دستی با هم (حداکثر ۵۰۰، هر کالا یک بار)؛ همه یا هیچ. `lines`: `{ productId, quantity }`.
 */
export async function countStocktakeLines({ stocktakeId, lines }) {
  const { data } = await axiosInstance.post("/Stocktake/CountStocktakeLines", { stocktakeId, lines }, TIMEOUT);
  return data;
}

/**
 * گذارِ وضعیت: `SubmitStocktake` (پایانِ شمارش)، `ReopenStocktake`، `ApproveStocktake` (اعمالِ مغایرت)، `CancelStocktake`.
 * همه `{ id }`.
 */
export async function changeStocktakeStatus(action, id, { idempotencyKey } = {}) {
  const { data } = await axiosInstance.post(`/Stocktake/${action}`, { id }, { ...TIMEOUT, ...idempotent(idempotencyKey) });
  return data;
}
