// src/shared/services/files/queries.js
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { getImageUrl } from "./client";
import { fileKeys } from "./queryKeys";

/**
 * URLهای امضاشده پیش‌فرض ۶۰ دقیقه اعتبار دارند. کش کمی زودتر کهنه
 * می‌شود تا کاربری که یک ساعت روی همان صفحه مانده، به‌جای عکسِ شکسته یک
 * امضای تازه بگیرد.
 */
const SIGNED_URL_STALE_TIME = 45 * 60 * 1000;
const SIGNED_URL_GC_TIME = 50 * 60 * 1000;

/**
 * امضای تازه برای یک `objectKey`.
 *
 * `initialUrl` همان `imageUrl`ی است که در پاسخِ لیست/جزئیات آمده — تا
 * وقتی تازه است هیچ درخواستِ اضافه‌ای زده نمی‌شود؛ این هوک فقط جایگزینِ
 * *تمدید* است، نه جایگزینِ خودِ پاسخ.
 */
export function useImageUrlQuery(objectKey, { enabled = true, initialUrl } = {}) {
  return useQuery({
    queryKey: fileKeys.url(objectKey),
    queryFn: ({ signal }) => getImageUrl(objectKey, { signal }),
    enabled: Boolean(objectKey) && enabled,
    staleTime: SIGNED_URL_STALE_TIME,
    gcTime: SIGNED_URL_GC_TIME,
    initialData: initialUrl || undefined,
    // امضا فقط با گذشتِ زمان باطل می‌شود، نه با برگشتنِ کاربر به تب.
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

/** ریختنِ یک URLِ تازه در کش — بعد از آپلود، تا هیچ‌کس دوباره امضا نگیرد. */
export function useSeedImageUrl() {
  const queryClient = useQueryClient();

  return (objectKey, url) => {
    if (!objectKey || !url) return;
    queryClient.setQueryData(fileKeys.url(objectKey), url);
  };
}
