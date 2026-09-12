// src/shared/services/invoice/documentOutput.js

import axiosInstance from "@/shared/services/api/axios";
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
 * قبلاً دکمه‌ی چاپ همیشه یک جدولِ HTML از روی *داده‌ی فرم* می‌ساخت و
 * دکمه‌ی دانلود هیچ‌وقت به ضمیمه‌ها کاری نداشت — یعنی کاربر فاکتوری را
 * چاپ می‌کرد که هیچ‌کدام از دو طرفِ معامله امضایش نکرده بود.
 *
 * شکلِ یک سند: `{ id, name, isPdf, getBlob }`.
 */

/**
 * بایت‌های یک ضمیمه.
 *
 * از همان `axiosInstance` رد می‌شود نه `fetch` خام: هدرها، CORS و
 * ترجمه‌ی پیامِ خطا همه یک‌جا تنظیم شده‌اند. آدرس مطلق است، پس
 * `baseURL` نادیده گرفته می‌شود. (`api/File/GetImage` خودش
 * `[AllowAnonymous]` است؛ هدرِ Authorization اضافه ضرری ندارد.)
 */
async function fetchAttachmentBlob(url) {
  const { data } = await axiosInstance.get(url, {
    responseType: "blob",
    timeout: 60000,
  });
  return data;
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

/** ذخیره‌ی یک Blob با نامِ دلخواه. */
function saveBlobAs(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  // آزادکردنِ فوری در بعضی مرورگرها (فایرفاکس) دانلودِ فایلِ بزرگ را
  // نصفه رها می‌کند، چون دانلود هنوز از همین URL می‌خواند.
  setTimeout(() => URL.revokeObjectURL(url), 60000);
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
function printPdfBlob(blob) {
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

/** تصویرها همه در یک صفحه، هر کدام روی یک برگه. */
function printImageBlobs(blobs) {
  const urls = blobs.map((blob) => URL.createObjectURL(blob));
  const win = window.open("", "_blank", "width=900,height=1200");

  if (!win) {
    urls.forEach(URL.revokeObjectURL);
    throw new Error("پنجره‌ی چاپ باز نشد؛ مسدودکننده‌ی پاپ‌آپ را غیرفعال کنید.");
  }

  win.document.write(`<!DOCTYPE html>
<html dir="rtl" lang="fa"><head><meta charset="utf-8" /><title>چاپ سند</title>
<style>
  @page { margin: 10mm; }
  body { margin: 0; }
  img { display: block; width: 100%; object-fit: contain; }
  img + img { page-break-before: always; }
</style></head>
<body>${urls.map((url) => `<img src="${url}" />`).join("")}</body></html>`);
  win.document.close();

  // چاپ فقط بعد از بارگذاریِ *همه‌ی* تصویرها؛ وگرنه برگه‌های خالی
  // چاپ می‌شوند.
  const images = [...win.document.images];
  let remaining = images.length;
  const start = () => {
    if (--remaining > 0) return;
    win.focus();
    win.print();
  };

  images.forEach((image) => {
    if (image.complete) start();
    else {
      image.addEventListener("load", start);
      image.addEventListener("error", start);
    }
  });
}

/** چاپِ همه‌ی سندها — تصویرها با هم، هر PDF جداگانه. */
export async function printDocuments(documents) {
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

  const images = loaded.filter((item) => !item.isPdf);
  if (images.length) printImageBlobs(images.map((item) => item.blob));

  loaded.filter((item) => item.isPdf).forEach((item) => printPdfBlob(item.blob));

  return failures;
}
