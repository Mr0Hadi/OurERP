import axiosInstance from "@/shared/services/api/axios";
import { unwrapBlobError } from "@/shared/services/api/blob";
import { compactParams, idempotent } from "@/shared/services/api/contract";

/**
 * لایه‌ی تماس با `api/DataTransfer` — ورود و خروجِ اطلاعاتِ جدول‌ها با CSV/Excel.
 *
 * یک کنترلر برای همه‌ی جدول‌ها؛ جدول با `resource` (مثلِ `"products"`) مشخص
 * می‌شود. همه‌ی کارِ واقعی (اعتبارسنجی، تبدیل، تکراری‌ها، تراکنش، دسترسی) سمتِ
 * سرور است؛ این‌جا فقط فایل می‌رود و نتیجه برمی‌گردد.
 */

/** `DataTransferFormatEnum`ِ سرور. */
export const DATA_TRANSFER_FORMATS = Object.freeze({ CSV: 1, XLSX: 2 });

export const FORMAT_EXTENSIONS = Object.freeze({
  [DATA_TRANSFER_FORMATS.CSV]: ".csv",
  [DATA_TRANSFER_FORMATS.XLSX]: ".xlsx",
});

/** ساختِ فایل و خواندنِ چند هزار ردیف از تایم‌اوتِ ۱۵ ثانیه‌ایِ پیش‌فرض بیشتر طول می‌کشد. */
const FILE_TIMEOUT = 120000;

/** نامِ فایل از `Content-Disposition` (`filename*` با UTF-8 برای نامِ فارسی). */
function fileNameFrom(headers, fallback) {
  const header = headers?.["content-disposition"];
  if (!header) return fallback;
  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (encoded) {
    try {
      return decodeURIComponent(encoded[1]);
    } catch {
      return fallback;
    }
  }
  const plain = /filename="?([^";]+)"?/i.exec(header);
  return plain ? plain[1] : fallback;
}

async function fetchFile(url, params, fallbackName) {
  try {
    const response = await axiosInstance.get(url, {
      params,
      responseType: "blob",
      timeout: FILE_TIMEOUT,
    });
    return { blob: response.data, fileName: fileNameFrom(response.headers, fallbackName) };
  } catch (error) {
    return unwrapBlobError(error);
  }
}

/** `GET GetResources` — جدول‌ها و کاری که کاربرِ فعلی روی هرکدام مجاز است. */
export async function fetchDataTransferResources() {
  const { data } = await axiosInstance.get("/DataTransfer/GetResources");
  return data?.resources ?? [];
}

/**
 * `GET Export` — فیلترها همان نام‌های لیستِ جدول‌اند و بی‌تغییر می‌روند؛ سرور
 * همان کدِ فیلترِ لیست را اجرا می‌کند. صفحه‌بندی و مرتب‌سازی معنایی ندارد.
 */
export function exportResource({ resource, format, filters, title }) {
  return fetchFile(
    "/DataTransfer/Export",
    { ...compactParams(filters ?? {}), resource, format },
    `${title ?? resource}${FORMAT_EXTENSIONS[format]}`,
  );
}

/** `GET GetImportTemplate` — فایلِ خالی با سرستون‌های درست. */
export function downloadImportTemplate({ resource, format, title }) {
  return fetchFile(
    "/DataTransfer/GetImportTemplate",
    { resource, format },
    `${title ?? resource}-نمونه${FORMAT_EXTENSIONS[format]}`,
  );
}

function importForm({ resource, file, skipInvalidRows }) {
  const form = new FormData();
  form.append("resource", resource);
  form.append("file", file);
  if (skipInvalidRows !== undefined) form.append("skipInvalidRows", String(skipInvalidRows));
  return form;
}

/** `POST PreviewImport` — فقط بررسی؛ چیزی ثبت نمی‌شود. @returns نتیجه‌ی `ImportResultDto` */
export async function previewImport({ resource, file }) {
  const { data } = await axiosInstance.post("/DataTransfer/PreviewImport", importForm({ resource, file }), {
    timeout: FILE_TIMEOUT,
  });
  return data;
}

/**
 * `POST CommitImport` — همان فایل دوباره؛ سرور از نو بررسی می‌کند و ردیف‌های
 * معتبر را در یک تراکنش ثبت می‌کند.
 */
export async function commitImport({ resource, file, skipInvalidRows, idempotencyKey }) {
  const { data } = await axiosInstance.post(
    "/DataTransfer/CommitImport",
    importForm({ resource, file, skipInvalidRows }),
    { timeout: FILE_TIMEOUT, ...idempotent(idempotencyKey) },
  );
  return data;
}
