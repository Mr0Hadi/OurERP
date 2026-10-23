import axiosInstance from "@/shared/services/api/axios";
import { unwrapBlobError } from "@/shared/services/api/blob";

/**
 * لایه‌ی تماس با `api/Invoice` (بخش ۱۳ سند api-guide.fa.md) — فاکتورِ
 * *رسمیِ* PDF که خودِ سرور می‌سازد.
 *
 * دو نکته‌ی قرارداد:
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

/** `GET api/Invoice/GetSaleInvoicePdf` @returns Blob با `application/pdf` */
export const getSaleInvoicePdf = (saleId) =>
  fetchPdf("/Invoice/GetSaleInvoicePdf", { saleId });

/**
 * `GET api/Invoice/GetSaleReturnCreditNotePdf` — «برگه‌ی طلبکاری».
 * فقط وقتی معنا دارد که مرجوعی حداقل یک اثرِ `MONEY_OUT` داشته باشد؛
 * وگرنه سرور ۴۰۰ با همین توضیح می‌دهد.
 *
 * @returns Blob با `application/pdf`
 */
export const getSaleReturnCreditNotePdf = (saleReturnId) =>
  fetchPdf("/Invoice/GetSaleReturnCreditNotePdf", { saleReturnId });


/**
 * `GET api/Invoice/GetPurchaseReturnPdf` — «برگه‌ی مرجوعی به تامین‌کننده».
 * برای هر مرجوعیِ خرید ساخته می‌شود (شرطِ اثرِ پولی ندارد) و همراهِ کالا
 * می‌رود.
 *
 * @returns Blob با `application/pdf`
 */
export const getPurchaseReturnPdf = (purchaseReturnId) =>
  fetchPdf("/Invoice/GetPurchaseReturnPdf", { purchaseReturnId });

/**
 * داده‌ی سندِ چاپی (JSON) — همان `InvoiceDocumentModel`ی که PDFِ رسمی از آن ساخته می‌شود، تا فرانت همان
 * سند را با کاغذ و چیدمانِ انتخابیِ کاربر در مرورگر چاپ کند (`InvoicePrintStudio`). شکلِ پاسخ:
 * `{ title, isProforma, documentNumber, documentDate, paymentDueDate, statusText, description, notes[],
 * company, counterpartyLabel, counterparty, lines[], subTotal, totalDiscount, totalTax, grandTotal,
 * installmentChargeAmount, payableAmount, paidAmount, balance }`.
 *
 * TODO(بکند): هر سه endpoint هنوز روی سرور نیستند (بندِ ۲۷ frontend-requests.fa.md)؛ تا آن وقت ۴۰۴ می‌آید.
 */
const DOCUMENT_ENDPOINTS = Object.freeze({
  sale: { url: "/Invoice/GetSaleInvoiceDocument", param: "saleId" },
  saleReturn: { url: "/Invoice/GetSaleReturnCreditNoteDocument", param: "saleReturnId" },
  purchaseReturn: { url: "/Invoice/GetPurchaseReturnDocument", param: "purchaseReturnId" },
});

/** سندهایی که سرور داده‌ی چاپی‌شان را می‌دهد — همان `documentKind`ِ `InvoiceDocumentSection`. */
export const hasPrintableDocument = (documentKind) => Boolean(DOCUMENT_ENDPOINTS[documentKind]);

/**
 * @param documentKind `"sale"` / `"saleReturn"` / `"purchaseReturn"`
 * @param documentId   شناسه‌ی سندِ ذخیره‌شده
 */
export async function getInvoiceDocument(documentKind, documentId) {
  const endpoint = DOCUMENT_ENDPOINTS[documentKind];
  if (!endpoint) throw new Error(`سندِ چاپیِ «${documentKind}» تعریف نشده است.`);
  const { data } = await axiosInstance.get(endpoint.url, { params: { [endpoint.param]: documentId } });
  return data;
}
