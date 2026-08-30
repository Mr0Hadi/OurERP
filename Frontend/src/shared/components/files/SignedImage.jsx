// src/shared/components/files/SignedImage.jsx
import { ImageOff } from "lucide-react";
import { useState } from "react";

import { cn } from "@/shared/lib/utils";
import { splitImageSource } from "@/shared/services/files/objectKey";
import { useImageUrlQuery } from "@/shared/services/files/queries";

/**
 * نمایشِ تصویری که کلیدش پایدار و آدرسش موقتی است.
 *
 * قرارداد سرور: در هر خروجیِ خواندن دو فیلد می‌آید — `imageKey` (پایدار)
 * و `imageUrl` (امضای موقت، پیش‌فرض ۶۰ دقیقه). یک `<img src={imageUrl}>`
 * ساده روی صفحه‌ای که باز مانده یا لیستی که کش شده، بعد از انقضا فقط یک
 * عکسِ شکسته است.
 *
 * این کامپوننت همان `imageUrl` را نشان می‌دهد (پس در حالت عادی هیچ
 * درخواستِ اضافه‌ای زده نمی‌شود) و *فقط اگر* بارگذاری شکست خورد، با
 * `GetImageUrl` یک امضای تازه می‌گیرد. امضای تازه در کشِ مشترک می‌نشیند،
 * پس بقیه‌ی جاهایی که همان کلید را نشان می‌دهند هم درست می‌شوند.
 */
export default function SignedImage({
  imageKey: rawKey,
  imageUrl: rawUrl,
  alt = "",
  className,
  fallback,
  ...imgProps
}) {
  const { key: imageKey, url: imageUrl } = splitImageSource(rawKey, rawUrl);

  // مقدارِ تازه از سرور (مثلاً بعد از invalidate) یعنی باید دوباره تلاش
  // کنیم. الگوی رسمیِ «ریست state با تغییرِ prop» در همان رندر انجام
  // می‌شود، نه در effect — وگرنه یک رندرِ اضافه با srcِ کهنه می‌خورد.
  const [expired, setExpired] = useState(false);
  const [lastSource, setLastSource] = useState(imageUrl ?? imageKey);

  if (lastSource !== (imageUrl ?? imageKey)) {
    setLastSource(imageUrl ?? imageKey);
    setExpired(false);
  }

  const { data: refreshedUrl, isError } = useImageUrlQuery(imageKey, {
    // تا وقتی URLِ همراهِ پاسخ کار می‌کند، چیزی گرفته نمی‌شود.
    enabled: Boolean(imageKey) && (expired || !imageUrl),
  });

  const src = expired ? refreshedUrl : imageUrl || refreshedUrl;

  if (!src || isError) {
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
      // یک بار: اگر امضای تازه هم شکست بخورد، حلقه‌ی بی‌پایان نمی‌سازیم.
      onError={() => !expired && setExpired(true)}
      {...imgProps}
    />
  );
}
