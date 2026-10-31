import { saveBlobAs } from "@/shared/lib/saveBlob";
import { isPdfName } from "@/shared/services/files/fileConstraints";

/**
 * «چاپ» و «دانلود» برای سندهای *واقعیِ* یک سفارش.
 *
 * تعریفِ سندِ واقعی با نوعِ سفارش فرق می‌کند:
 *
 * - **خرید:** پیش‌فاکتور و فاکتور را تامین‌کننده می‌فرستد و کاربر دستی
 *   ضمیمه می‌کند. پس تنها سندِ معتبر همان فایل‌های ضمیمه‌اند.
 * - **فروش:** فاکتور را خودِ بکند می‌سازد
 *   (`api/Invoice/GetSaleInvoicePdf`)، و کاربر هم می‌تواند نسخه‌ی
 *   دستی ضمیمه کند. هر دو باید چاپ/دانلود شوند.
 *
 * یک جدولِ HTML که فرانت از روی داده‌ی فرم بسازد سند نیست: کاربر
 * فاکتوری چاپ می‌کند که هیچ‌کدام از دو طرفِ معامله امضایش نکرده‌اند.
 *
 * شکلِ یک سند: `{ id, name, isPdf, getBlob }`.
 */

/**
 * بایت‌های یک ضمیمه.
 *
 * عمداً با `fetch` خام، نه `axiosInstance`: `api/File/GetImage`
 * `[AllowAnonymous]` است و به توکن نیازی ندارد، و رد شدن از اینترسپتور
 * یعنی هر ۴۰۱ یا خطای این درخواستِ فایل مسیرِ رفرش/خروجِ کلِ برنامه را
 * راه می‌اندازد — همان «چاپ ضمیمه → خروج از حساب».
 */
async function fetchAttachmentBlob(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`دریافت فایل ممکن نشد (${response.status}).`);
    }
    return await response.blob();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * قلم‌های آماده‌ی `useFileUploadList` → سند.
 *
 * قلمی که هنوز در حال آپلود است یا خطا خورده کنار گذاشته می‌شود: کلید
 * ندارد، پس چیزی برای گرفتن هم نیست.
 */
export function attachmentDocuments(attachments) {
  return (attachments?.items ?? [])
    // شرط دقیقاً همان چیزی است که `getBlob` لازم دارد: یا فایلِ محلی
    // یا آدرسی روی سرور. قلمِ در حال آپلود یا شکست‌خورده هیچ‌کدام را
    // ندارد.
    .filter((item) => item.status === "ready" && (item.file || item.url))
    .map((item) => ({
      id: `attachment-${item.id}`,
      name: item.fileName || item.objectKey || "attachment",
      isPdf: isPdfName(item.fileName) || isPdfName(item.objectKey || ""),
      // فایلی که همین حالا انتخاب شده و هنوز از سرور خوانده نشده، از
      // روی همان blobِ محلی چاپ می‌شود — نه یک رفت‌وبرگشتِ اضافه.
      getBlob: () =>
        item.file
          ? Promise.resolve(item.file)
          : fetchAttachmentBlob(item.url),
    }));
}

/** سندِ PDFی که سرور می‌سازد. */
export function serverDocument({ name, fetchPdf }) {
  return {
    id: "server-pdf",
    name: name.toLowerCase().endsWith(".pdf") ? name : `${name}.pdf`,
    isPdf: true,
    getBlob: fetchPdf,
  };
}

/** دانلودِ همه‌ی سندها. خطای یک سند بقیه را متوقف نمی‌کند. */
export async function downloadDocuments(documents) {
  const failures = [];

  for (const document_ of documents) {
    try {
      saveBlobAs(await document_.getBlob(), document_.name);
    } catch (error) {
      failures.push(document_.name);
      if (import.meta.env?.DEV) console.error(document_.name, error);
    }
  }

  return failures;
}

/**
 * PDF در یک iframeِ پنهان چاپ می‌شود، نه در تبِ تازه.
 *
 * چرا: `window.open(blobUrl)` تبی باز می‌کند که ما به سندِ داخلش دسترسی
 * نداریم، پس نمی‌شود `print()` صدا زد و کاربر باید خودش دنبال دکمه‌ی
 * چاپِ نمایشگرِ PDF بگردد. iframe هم‌مبدأ است، پس `contentWindow.print()`
 * کار می‌کند و پنجره‌ی چاپ مستقیم بالا می‌آید.
 */
export function printPdfBlob(blob) {
  const url = URL.createObjectURL(blob);
  const frame = document.createElement("iframe");

  // نه `display:none`: مرورگر سندِ نامرئی را رندر نمی‌کند و چاپ خالی
  // درمی‌آید. بیرونِ کادرِ دید گذاشته می‌شود تا رندر بشود ولی دیده نشود.
  frame.style.cssText =
    "position:fixed;right:100%;bottom:100%;width:1px;height:1px;border:0;";
  frame.src = url;

  frame.addEventListener("load", () => {
    try {
      frame.contentWindow.focus();
      frame.contentWindow.print();
    } catch {
      // بعضی مرورگرها نمایشگرِ PDF را جدا اجرا می‌کنند؛ آن‌وقت لااقل
      // فایل باز شود تا کاربر دستی چاپ کند.
      window.open(url, "_blank", "noopener");
    }
  });

  document.body.appendChild(frame);

  // زودتر از این نمی‌شود آزاد کرد: تا وقتی پنجره‌ی چاپ باز است نمایشگر
  // هنوز از همین URL می‌خواند.
  setTimeout(() => {
    frame.remove();
    URL.revokeObjectURL(url);
  }, 120000);
}

/**
 * بایت‌های چند سند. خطای یک سند بقیه را متوقف نمی‌کند.
 *
 * @returns `{ loaded: [{ ...document, blob }], failures: [name] }`
 */
export async function loadDocuments(documents) {
  const failures = [];
  const loaded = [];

  for (const document_ of documents) {
    try {
      loaded.push({ ...document_, blob: await document_.getBlob() });
    } catch (error) {
      failures.push(document_.name);
      if (import.meta.env?.DEV) console.error(document_.name, error);
    }
  }

  return { loaded, failures };
}

/**
 * چاپِ سندهای PDF، هر کدام جدا با اندازه‌ی کاغذِ خودش.
 *
 * تصویرها اینجا چاپ نمی‌شوند: کاغذ، حاشیه و چیدمانشان را کاربر در
 * `DocumentPrintStudio` (`src/shared/components/invoice/`) انتخاب می‌کند و
 * از همان پوسته‌ی مشترکِ چاپ بیرون می‌آیند — نه پنجره‌ی پاپ‌آپی که مرورگرِ
 * موبایل اغلب می‌بندد.
 */
export async function printPdfDocuments(documents) {
  const { loaded, failures } = await loadDocuments(documents.filter((item) => item.isPdf));
  loaded.forEach((item) => printPdfBlob(item.blob));
  return failures;
}
