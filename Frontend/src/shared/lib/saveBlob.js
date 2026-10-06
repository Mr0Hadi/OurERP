/** ذخیره‌ی یک Blob با نامِ دلخواه (دانلودِ مرورگر). */
export function saveBlobAs(blob, fileName) {
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
