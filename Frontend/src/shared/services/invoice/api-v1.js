// src/shared/services/invoice/api-v1.js

import axiosInstance from "@/shared/services/api/axios";

/**
 * لایه‌ی تماس با `api/Invoice` (بخش ۱۳ سند api-guide.fa.md) — فاکتورِ
 * *رسمیِ* PDF که خودِ سرور می‌سازد.
 *
 * دو نکته‌ی قرارداد، دقیقاً مثل `services/barcode/api-v1.js`:
 *
 * ۱. این endpointها پوششِ `ResponseDto` ندارند و مستقیماً
 *    `application/pdf` برمی‌گردانند — پس `responseType: "blob"`.
 * ۲. خطا همچنان JSONِ استاندارد است، ولی با responseType بلاب،
 *    اینترسپتورِ axios نمی‌تواند پیامِ فارسی را بیرون بکشد؛ همان‌جا
 *    (`unwrapBlobError`) باز می‌شود.
 *
 * تفاوتش با «چاپ/دانلود» داخلِ `InvoiceDocumentSection`: آن یکی یک
 * پیش‌نمایشِ HTML از روی *داده‌ی همین فرم* است (حتی قبل از ذخیره کار
 * می‌کند)؛ این یکی سندِ رسمیِ روی سرور است و فقط برای سندِ ذخیره‌شده
 * معنا دارد.
 *
 * پیش‌فاکتور: بکند مسیر جدایی برای پیش‌فاکتور ندارد — همین endpointها
 * سندِ فعلی را با هر وضعیتی (از جمله `PROFORMA`) رندر می‌کنند. تفاوت
 * فقط در این است که سندِ پیش‌فاکتور هنوز شماره‌ی فاکتور ندارد.
 */

/** تا وقتی فیچرهای خرید/فروش روی `api-mockData` هستند، شناسه‌ها شناسه‌ی mock اند و سرور آن‌ها را نمی‌شناسد. */
export const SERVER_INVOICE_PDF_ENABLED =
  String(import.meta.env?.VITE_ENABLE_MOCK_API).toLowerCase() !== "true";

async function unwrapBlobError(error) {
  const body = error?.response?.data;
  if (!(body instanceof Blob)) throw error;

  try {
    const parsed = JSON.parse(await body.text());
    const message = parsed?.Message ?? parsed?.message ?? parsed?.title;
    if (message) error.message = message;
  } catch {
    // بدنه‌ی غیر JSON (مثلاً صفحه‌ی خطای پروکسی) — پیامِ خودِ axios می‌ماند.
  }

  throw error;
}

async function fetchPdf(url, params) {
  try {
    const { data } = await axiosInstance.get(url, {
      params,
      responseType: "blob",
      // ساختِ PDF سمتِ سرور از تایم‌اوتِ ۱۵ ثانیه‌ایِ پیش‌فرض بیشتر طول می‌کشد.
      timeout: 60000,
    });
    return data;
  } catch (error) {
    return unwrapBlobError(error);
  }
}

/** `GET api/Invoice/GetPurchaseInvoicePdf` @returns Blob با `application/pdf` */
export const getPurchaseInvoicePdf = (purchaseId) =>
  fetchPdf("/Invoice/GetPurchaseInvoicePdf", { purchaseId });

/** `GET api/Invoice/GetSaleInvoicePdf` @returns Blob با `application/pdf` */
export const getSaleInvoicePdf = (saleId) =>
  fetchPdf("/Invoice/GetSaleInvoicePdf", { saleId });

/**
 * `GET api/Invoice/GetSaleReturnCreditNotePdf` — «برگه‌ی بستانکاری».
 * فقط وقتی معنا دارد که مرجوعی حداقل یک اثرِ `MONEY_OUT` داشته باشد؛
 * وگرنه سرور ۴۰۰ با همین توضیح می‌دهد.
 *
 * @returns Blob با `application/pdf`
 */
export const getSaleReturnCreditNotePdf = (saleReturnId) =>
  fetchPdf("/Invoice/GetSaleReturnCreditNotePdf", { saleReturnId });

/** ذخیره‌ی یک Blob با نامِ دلخواه — همان کارِ دکمه‌ی دانلود، یک‌جا. */
export function saveBlobAs(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
