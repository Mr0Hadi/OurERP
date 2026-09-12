import { ImageOff } from "lucide-react";
import { useState } from "react";

import { cn } from "@/shared/lib/utils";
import { splitImageSource } from "@/shared/services/files/objectKey";
import { useImageUrlQuery } from "@/shared/services/files/queries";

/**
 * نمایشِ تصویری که با `objectKey` شناخته می‌شود.
 *
 * قرارداد سرور: هر خروجیِ خواندن دو فیلد دارد — `imageKey` (چیزی که
 * ذخیره شده و در آپدیتِ بعدی برمی‌گردد) و `imageUrl` (آدرسِ آماده‌ی
 * `<img src>`، روی خودِ API: `api/File/GetImage?objectKey=...`).
 *
 * قبلاً این کامپوننت `SignedImage` بود و کارش تمدیدِ امضای منقضی‌شده‌ی
 * باکت. آن دنیا تمام شد: باکتِ Liara به User-Agentِ مرورگر ۴۰۴ می‌دهد،
 * پس هیچ آدرسِ باکتی — امضاشده یا نه — در `<img>` بار نمی‌شود و سرور
 * بایت‌ها را خودش سرو می‌کند. آدرسِ تازه ثابت است، پس نه انقضایی هست و
 * نه تمدیدی؛ تنها کارِ باقی‌مانده این است که اگر پاسخ فقط `imageKey`
 * داشت، آدرس یک‌بار از `GetImageUrl` گرفته شود.
 */
export default function RemoteImage({
  imageKey: rawKey,
  imageUrl: rawUrl,
  alt = "",
  className,
  fallback,
  ...imgProps
}) {
  const { key: imageKey, url: imageUrl } = splitImageSource(rawKey, rawUrl);

  // آدرس ثابت است، پس «بار نشد» یعنی فایل واقعاً نیست (پاک شده یا کلید
  // غلط است) — تلاشِ دوباره همان ۴۰۴ را می‌آورد. پس به‌جای گرفتنِ آدرسِ
  // تازه، همان fallbackِ کادرِ خالی نشان داده می‌شود؛ وگرنه کاربر آیکونِ
  // شکسته‌ی مرورگر را می‌بیند.
  const [failed, setFailed] = useState(false);

  // مقدارِ تازه از سرور یعنی باید دوباره تلاش کنیم. الگوی رسمیِ «ریست
  // state با تغییرِ prop» در همان رندر انجام می‌شود، نه در effect.
  const [lastSource, setLastSource] = useState(rawUrl ?? rawKey);
  if (lastSource !== (rawUrl ?? rawKey)) {
    setLastSource(rawUrl ?? rawKey);
    setFailed(false);
  }

  const { data: fetchedUrl, isError } = useImageUrlQuery(imageKey, {
    // وقتی پاسخ خودش آدرس داده، هیچ رفت‌وبرگشتی لازم نیست.
    enabled: Boolean(imageKey) && !imageUrl,
  });

  const src = imageUrl || fetchedUrl;

  if (!src || isError || failed) {
    return (
      fallback ?? (
        <div
          className={cn(
            "flex items-center justify-center bg-muted text-muted-foreground",
            className
          )}
        >
          <ImageOff className="h-4 w-4" />
        </div>
      )
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
      {...imgProps}
    />
  );
}
